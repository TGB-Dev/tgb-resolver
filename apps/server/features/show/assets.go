package show

import (
	"context"
	"fmt"
	"strings"

	"tgb-resolver/server/features/assets"
	"tgb-resolver/server/features/shared/domain"
)

func (s *Service) UpsertAsset(ctx context.Context, assetID, fileName, contentType string, raw []byte, folderID *string, showVersion int) (domain.ShowState, error) {
	if err := s.blobs.Save(assetID, raw); err != nil {
		return domain.ShowState{}, err
	}
	updated, err := s.store.MutateShow(ctx, showVersion, func(st domain.ShowState) domain.ShowState {
		asset := domain.ShowAsset{
			ID: assetID, FileName: fileName, OriginalName: fileName,
			ContentType: contentType, SizeBytes: int64(len(raw)), Xxh3: xxh3Hex(raw),
			FolderID: folderID,
		}
		items := make([]domain.ShowAsset, 0, len(st.Assets.Items)+1)
		for _, a := range st.Assets.Items {
			if a.ID != assetID {
				items = append(items, a)
			}
		}
		items = append(items, asset)
		st.Assets.Items = items
		return st
	})
	if err != nil {
		_ = s.blobs.Delete(assetID)
		return domain.ShowState{}, err
	}
	s.broadcastReplaced(updated)
	return updated, nil
}

func (s *Service) DeleteEntry(ctx context.Context, id string, isDirectory bool, showVersion int) (domain.ShowState, error) {
	if !isDirectory {
		if err := s.blobs.Delete(id); err != nil {
			return domain.ShowState{}, err
		}
	}
	updated, err := s.store.MutateShow(ctx, showVersion, func(st domain.ShowState) domain.ShowState {
		if isDirectory {
			clearIDs := collectDescendantIDs(st.Assets.Folders, id)
			st.Assets.Folders = removeFolderNode(st.Assets.Folders, id)
			for i, a := range st.Assets.Items {
				if a.FolderID != nil && clearIDs[*a.FolderID] {
					st.Assets.Items[i].FolderID = nil
				}
			}
			return st
		}
		items := make([]domain.ShowAsset, 0, len(st.Assets.Items))
		for _, a := range st.Assets.Items {
			if a.ID != id {
				items = append(items, a)
			}
		}
		st.Assets.Items = items
		return st
	})
	if err != nil {
		return domain.ShowState{}, err
	}
	s.broadcastReplaced(updated)
	return updated, nil
}

func (s *Service) RenameEntry(ctx context.Context, id string, isDirectory bool, newName string, showVersion int) (domain.ShowState, error) {
	updated, err := s.store.MutateShow(ctx, showVersion, func(st domain.ShowState) domain.ShowState {
		if isDirectory {
			st.Assets.Folders = renameFolderNode(st.Assets.Folders, id, newName)
			return st
		}
		for i, a := range st.Assets.Items {
			if a.ID == id {
				st.Assets.Items[i].FileName = newName
			}
		}
		return st
	})
	if err != nil {
		return domain.ShowState{}, err
	}
	s.broadcastReplaced(updated)
	return updated, nil
}

func (s *Service) CreateFolder(ctx context.Context, name, parentFolderID string, showVersion int) (domain.ShowState, error) {
	updated, err := s.store.MutateShowChecked(ctx, showVersion, func(st domain.ShowState) (domain.ShowState, error) {
		if err := ensureWritable(st); err != nil {
			return st, err
		}
		folder := domain.FolderNode{ID: newID(), Name: name, Children: []domain.FolderNode{}}
		if parentFolderID == "" {
			st.Assets.Folders = append(st.Assets.Folders, folder)
			return st, nil
		}
		nodes, changed := insertFolderNode(st.Assets.Folders, parentFolderID, folder)
		if !changed {
			return st, fmt.Errorf("parent folder does not exist")
		}
		st.Assets.Folders = nodes
		return st, nil
	})
	if err != nil {
		return domain.ShowState{}, err
	}
	s.broadcastReplaced(updated)
	return updated, nil
}

func (s *Service) MoveAsset(ctx context.Context, assetID, targetFolderID string, showVersion int) (domain.ShowState, error) {
	updated, err := s.store.MutateShowChecked(ctx, showVersion, func(st domain.ShowState) (domain.ShowState, error) {
		if err := ensureWritable(st); err != nil {
			return st, err
		}
		target := normalizeFolderID(targetFolderID)
		if target != nil && findFolderNode(st.Assets.Folders, *target) == nil {
			return st, fmt.Errorf("target folder does not exist")
		}
		idx := -1
		for i, a := range st.Assets.Items {
			if a.ID == assetID {
				idx = i
				break
			}
		}
		if idx < 0 {
			return st, fmt.Errorf("asset '%s' does not exist", assetID)
		}
		if equalFolderID(st.Assets.Items[idx].FolderID, target) {
			return st, fmt.Errorf("asset is already in the target folder")
		}
		st.Assets.Items[idx].FolderID = target
		return st, nil
	})
	if err != nil {
		return domain.ShowState{}, err
	}
	s.broadcastReplaced(updated)
	return updated, nil
}

func (s *Service) TransferEntry(ctx context.Context, id string, in assets.TransferInput) (domain.ShowState, error) {
	if in.IsDirectory {
		if in.Copy {
			return s.copyFolder(ctx, id, in)
		}
		return s.moveFolder(ctx, id, in)
	}
	if in.Copy {
		return s.copyAsset(ctx, id, in)
	}
	target := ""
	if in.TargetFolderID != nil {
		target = *in.TargetFolderID
	}
	return s.MoveAsset(ctx, id, target, in.ShowVersion)
}

func (s *Service) copyAsset(ctx context.Context, id string, in assets.TransferInput) (domain.ShowState, error) {
	cur, err := s.store.GetState(ctx)
	if err != nil {
		return domain.ShowState{}, err
	}
	if err := ensureWritable(cur); err != nil {
		return domain.ShowState{}, err
	}
	target := normalizeFolderID(ptrStr(in.TargetFolderID))
	if target != nil && findFolderNode(cur.Assets.Folders, *target) == nil {
		return domain.ShowState{}, fmt.Errorf("target folder does not exist")
	}
	var source domain.ShowAsset
	found := false
	for _, a := range cur.Assets.Items {
		if a.ID == id {
			source = a
			found = true
		}
	}
	if !found {
		return domain.ShowState{}, fmt.Errorf("asset '%s' does not exist", id)
	}
	raw, err := s.blobs.Read(source.ID)
	if err != nil {
		return domain.ShowState{}, err
	}
	clonedID := newID()
	if err := s.blobs.Save(clonedID, raw); err != nil {
		return domain.ShowState{}, err
	}
	updated, err := s.store.MutateShowChecked(ctx, in.ShowVersion, func(st domain.ShowState) (domain.ShowState, error) {
		if err := ensureWritable(st); err != nil {
			return st, err
		}
		targetNow := normalizeFolderID(ptrStr(in.TargetFolderID))
		if targetNow != nil && findFolderNode(st.Assets.Folders, *targetNow) == nil {
			return st, fmt.Errorf("target folder does not exist")
		}
		stillThere := false
		for _, a := range st.Assets.Items {
			if a.ID == id {
				stillThere = true
			}
		}
		if !stillThere {
			return st, fmt.Errorf("asset '%s' no longer exists", id)
		}
		clone := source
		clone.ID = clonedID
		clone.FolderID = targetNow
		st.Assets.Items = append(st.Assets.Items, clone)
		return st, nil
	})
	if err != nil {
		_ = s.blobs.Delete(clonedID)
		return domain.ShowState{}, err
	}
	s.broadcastReplaced(updated)
	return updated, nil
}

func (s *Service) moveFolder(ctx context.Context, id string, in assets.TransferInput) (domain.ShowState, error) {
	updated, err := s.store.MutateShowChecked(ctx, in.ShowVersion, func(st domain.ShowState) (domain.ShowState, error) {
		if err := ensureWritable(st); err != nil {
			return st, err
		}
		target := normalizeFolderID(ptrStr(in.TargetFolderID))
		if target != nil && findFolderNode(st.Assets.Folders, *target) == nil {
			return st, fmt.Errorf("target folder does not exist")
		}
		without, source, found := extractFolderNode(st.Assets.Folders, id)
		if !found || source == nil {
			return st, fmt.Errorf("folder '%s' does not exist", id)
		}
		if target != nil && *target == id {
			return st, fmt.Errorf("folder cannot be moved into itself")
		}
		if target != nil && isDescendant(st.Assets.Folders, id, *target) {
			return st, fmt.Errorf("folder cannot be moved into one of its descendants")
		}
		if findParentFolderID(st.Assets.Folders, id) == ptrStrVal(target) && (target != nil) == (findParentFolderID(st.Assets.Folders, id) != "") {
			return st, fmt.Errorf("folder is already in the target folder")
		}
		if target == nil {
			st.Assets.Folders = append(without, *source)
		} else {
			nodes, _ := insertFolderNode(without, *target, *source)
			st.Assets.Folders = nodes
		}
		return st, nil
	})
	if err != nil {
		return domain.ShowState{}, err
	}
	s.broadcastReplaced(updated)
	return updated, nil
}

func (s *Service) copyFolder(ctx context.Context, id string, in assets.TransferInput) (domain.ShowState, error) {
	cur, err := s.store.GetState(ctx)
	if err != nil {
		return domain.ShowState{}, err
	}
	if err := ensureWritable(cur); err != nil {
		return domain.ShowState{}, err
	}
	target := normalizeFolderID(ptrStr(in.TargetFolderID))
	if target != nil && *target == id {
		return domain.ShowState{}, fmt.Errorf("folder cannot be copied into itself")
	}
	if target != nil && isDescendant(cur.Assets.Folders, id, *target) {
		return domain.ShowState{}, fmt.Errorf("folder cannot be copied into one of its descendants")
	}
	source := findFolderNode(cur.Assets.Folders, id)
	if source == nil {
		return domain.ShowState{}, fmt.Errorf("folder '%s' does not exist", id)
	}
	idMap := map[string]string{}
	cloned := cloneFolderTree(*source, idMap)
	sourceIDs := map[string]bool{}
	collectAllIDs(*source, sourceIDs)
	type assetCopy struct {
		meta domain.ShowAsset
		raw  []byte
	}
	copies := []assetCopy{}
	for _, a := range cur.Assets.Items {
		if a.FolderID != nil && sourceIDs[*a.FolderID] {
			raw, err := s.blobs.Read(a.ID)
			if err != nil {
				for _, c := range copies {
					_ = s.blobs.Delete(c.meta.ID)
				}
				return domain.ShowState{}, err
			}
			clonedID := newID()
			if err := s.blobs.Save(clonedID, raw); err != nil {
				for _, c := range copies {
					_ = s.blobs.Delete(c.meta.ID)
				}
				return domain.ShowState{}, err
			}
			meta := a
			meta.ID = clonedID
			if a.FolderID != nil {
				mapped := idMap[*a.FolderID]
				meta.FolderID = &mapped
			}
			copies = append(copies, assetCopy{meta: meta})
		}
	}
	updated, err := s.store.MutateShowChecked(ctx, in.ShowVersion, func(st domain.ShowState) (domain.ShowState, error) {
		if err := ensureWritable(st); err != nil {
			return st, err
		}
		if target != nil && findFolderNode(st.Assets.Folders, *target) == nil {
			return st, fmt.Errorf("target folder does not exist")
		}
		if target == nil {
			st.Assets.Folders = append(st.Assets.Folders, cloned)
		} else {
			nodes, _ := insertFolderNode(st.Assets.Folders, *target, cloned)
			st.Assets.Folders = nodes
		}
		for _, c := range copies {
			st.Assets.Items = append(st.Assets.Items, c.meta)
		}
		return st, nil
	})
	if err != nil {
		for _, c := range copies {
			_ = s.blobs.Delete(c.meta.ID)
		}
		return domain.ShowState{}, err
	}
	s.broadcastReplaced(updated)
	return updated, nil
}

func normalizeFolderID(id string) *string {
	if strings.TrimSpace(id) == "" {
		return nil
	}
	return &id
}

func ptrStr(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

func ptrStrVal(s *string) string { return ptrStr(s) }

func equalFolderID(a, b *string) bool {
	if a == nil || b == nil {
		return a == b
	}
	return *a == *b
}

func findFolderNode(nodes []domain.FolderNode, id string) *domain.FolderNode {
	for i := range nodes {
		if nodes[i].ID == id {
			return &nodes[i]
		}
		if found := findFolderNode(nodes[i].Children, id); found != nil {
			return found
		}
	}
	return nil
}

func findParentFolderID(nodes []domain.FolderNode, id string) string {
	for i := range nodes {
		for _, c := range nodes[i].Children {
			if c.ID == id {
				return nodes[i].ID
			}
		}
		if parent := findParentFolderID(nodes[i].Children, id); parent != "" {
			return parent
		}
	}
	return ""
}

func insertFolderNode(nodes []domain.FolderNode, parentID string, folder domain.FolderNode) ([]domain.FolderNode, bool) {
	out := append([]domain.FolderNode{}, nodes...)
	for i := range out {
		if out[i].ID == parentID {
			out[i].Children = append(out[i].Children, folder)
			return out, true
		}
		children, changed := insertFolderNode(out[i].Children, parentID, folder)
		if changed {
			out[i].Children = children
			return out, true
		}
	}
	return nodes, false
}

func extractFolderNode(nodes []domain.FolderNode, id string) ([]domain.FolderNode, *domain.FolderNode, bool) {
	out := append([]domain.FolderNode{}, nodes...)
	for i := range out {
		if out[i].ID == id {
			node := out[i]
			return append(out[:i], out[i+1:]...), &node, true
		}
		children, extracted, found := extractFolderNode(out[i].Children, id)
		if found {
			out[i].Children = children
			return out, extracted, true
		}
	}
	return nodes, nil, false
}

func renameFolderNode(nodes []domain.FolderNode, id, newName string) []domain.FolderNode {
	out := append([]domain.FolderNode{}, nodes...)
	for i := range out {
		if out[i].ID == id {
			out[i].Name = newName
			return out
		}
		out[i].Children = renameFolderNode(out[i].Children, id, newName)
	}
	return out
}

func removeFolderNode(nodes []domain.FolderNode, id string) []domain.FolderNode {
	out := make([]domain.FolderNode, 0, len(nodes))
	for _, n := range nodes {
		if n.ID == id {
			continue
		}
		n.Children = removeFolderNode(n.Children, id)
		out = append(out, n)
	}
	return out
}

func collectAllIDs(node domain.FolderNode, ids map[string]bool) {
	ids[node.ID] = true
	for _, c := range node.Children {
		collectAllIDs(c, ids)
	}
}

func collectDescendantIDs(nodes []domain.FolderNode, id string) map[string]bool {
	result := map[string]bool{id: true}
	var walk func([]domain.FolderNode)
	walk = func(ns []domain.FolderNode) {
		for _, n := range ns {
			if n.ID == id {
				collectAllIDs(n, result)
			} else {
				walk(n.Children)
			}
		}
	}
	walk(nodes)
	return result
}

func isDescendant(nodes []domain.FolderNode, sourceID, maybeDescendantID string) bool {
	source := findFolderNode(nodes, sourceID)
	if source == nil {
		return false
	}
	ids := map[string]bool{}
	collectAllIDs(*source, ids)
	return ids[maybeDescendantID]
}

func cloneFolderTree(source domain.FolderNode, idMap map[string]string) domain.FolderNode {
	clonedID := newID()
	idMap[source.ID] = clonedID
	children := make([]domain.FolderNode, 0, len(source.Children))
	for _, c := range source.Children {
		children = append(children, cloneFolderTree(c, idMap))
	}
	return domain.FolderNode{ID: clonedID, Name: source.Name, Children: children}
}
