package assets

import (
	"context"
	"encoding/base64"
	"net/http"

	"github.com/danielgtaylor/huma/v2"

	"tgb-resolver/server-go/features/shared/domain"
)

const (
	opGetAsset      = "TGBResolverServerFeaturesAssetsGetAssetEndpoint"
	opPutAsset      = "TGBResolverServerFeaturesAssetsPutAssetEndpoint"
	opCreateFolder  = "TGBResolverServerFeaturesAssetsCreateFolderEndpoint"
	opDeleteEntry   = "TGBResolverServerFeaturesAssetsDeleteEntryEndpoint"
	opRenameEntry   = "TGBResolverServerFeaturesAssetsRenameEntryEndpoint"
	opMoveAsset     = "TGBResolverServerFeaturesAssetsMoveAssetEndpoint"
	opTransferEntry = "TGBResolverServerFeaturesAssetsTransferEntryEndpoint"
)

type ShowService interface {
	Snapshot(ctx context.Context) (domain.ShowState, error)
	UpsertAsset(ctx context.Context, assetID, fileName, contentType string, raw []byte, folderID *string, showVersion int) (domain.ShowState, error)
	DeleteEntry(ctx context.Context, id string, isDirectory bool, showVersion int) (domain.ShowState, error)
	RenameEntry(ctx context.Context, id string, isDirectory bool, newName string, showVersion int) (domain.ShowState, error)
	CreateFolder(ctx context.Context, name, parentFolderID string, showVersion int) (domain.ShowState, error)
	MoveAsset(ctx context.Context, assetID, targetFolderID string, showVersion int) (domain.ShowState, error)
	TransferEntry(ctx context.Context, id string, in TransferInput) (domain.ShowState, error)
}

type TransferInput struct {
	ShowVersion    int
	IsDirectory    bool
	TargetFolderID *string
	Copy           bool
}

type showBody struct {
	Body domain.ShowState
}

func ok(st domain.ShowState) *showBody { return &showBody{Body: st} }

func badRequest(err error) error {
	return huma.Error400BadRequest(err.Error())
}

func RegisterAssetRoutes(api huma.API, svc ShowService, blobs *FileStore) {
	huma.Register(api, huma.Operation{OperationID: opPutAsset, Method: http.MethodPost, Path: "/assets/{id}"},
		func(ctx context.Context, input *struct {
			ID   string `path:"id"`
			Body UpsertAssetRequest
		}) (*showBody, error) {
			raw, err := base64.StdEncoding.DecodeString(input.Body.Bytes)
			if err != nil {
				return nil, huma.Error400BadRequest("invalid base64 bytes")
			}
			st, err := svc.UpsertAsset(ctx, input.ID, input.Body.FileName, input.Body.ContentType, raw, input.Body.FolderID, input.Body.ShowVersion)
			if err != nil {
				return nil, badRequest(err)
			}
			return ok(st), nil
		})

	huma.Register(api, huma.Operation{OperationID: opCreateFolder, Method: http.MethodPost, Path: "/assets/folders"},
		func(ctx context.Context, input *struct {
			Body CreateFolderRequest
		}) (*showBody, error) {
			st, err := svc.CreateFolder(ctx, input.Body.Name, input.Body.ParentFolderID, input.Body.ShowVersion)
			if err != nil {
				return nil, badRequest(err)
			}
			return ok(st), nil
		})

	huma.Register(api, huma.Operation{OperationID: opDeleteEntry, Method: http.MethodDelete, Path: "/assets/entries/{id}"},
		func(ctx context.Context, input *struct {
			ID   string `path:"id"`
			Body DeleteEntryRequest
		}) (*showBody, error) {
			st, err := svc.DeleteEntry(ctx, input.ID, input.Body.IsDirectory, input.Body.ShowVersion)
			if err != nil {
				return nil, badRequest(err)
			}
			return ok(st), nil
		})

	huma.Register(api, huma.Operation{OperationID: opRenameEntry, Method: http.MethodPatch, Path: "/assets/entries/{id}"},
		func(ctx context.Context, input *struct {
			ID   string `path:"id"`
			Body RenameEntryRequest
		}) (*showBody, error) {
			st, err := svc.RenameEntry(ctx, input.ID, input.Body.IsDirectory, input.Body.NewName, input.Body.ShowVersion)
			if err != nil {
				return nil, badRequest(err)
			}
			return ok(st), nil
		})

	huma.Register(api, huma.Operation{OperationID: opMoveAsset, Method: http.MethodPatch, Path: "/assets/{assetId}/move"},
		func(ctx context.Context, input *struct {
			AssetID string `path:"assetId"`
			Body    MoveAssetRequest
		}) (*showBody, error) {
			assetID := input.Body.AssetID
			if assetID == "" {
				assetID = input.AssetID
			}
			st, err := svc.MoveAsset(ctx, assetID, input.Body.TargetFolderID, input.Body.ShowVersion)
			if err != nil {
				return nil, badRequest(err)
			}
			return ok(st), nil
		})

	huma.Register(api, huma.Operation{OperationID: opTransferEntry, Method: http.MethodPatch, Path: "/assets/entries/{id}/transfer"},
		func(ctx context.Context, input *struct {
			ID   string `path:"id"`
			Body TransferEntryRequest
		}) (*showBody, error) {
			st, err := svc.TransferEntry(ctx, input.ID, TransferInput{
				ShowVersion: input.Body.ShowVersion, IsDirectory: input.Body.IsDirectory,
				TargetFolderID: input.Body.TargetFolderID, Copy: input.Body.Copy,
			})
			if err != nil {
				return nil, badRequest(err)
			}
			return ok(st), nil
		})
}
