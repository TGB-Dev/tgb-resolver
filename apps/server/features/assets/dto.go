package assets

type UpsertAssetRequest struct {
	ShowVersion int     `json:"showVersion,omitempty"`
	FileName    string  `json:"fileName" minLength:"1" maxLength:"255"`
	ContentType string  `json:"contentType" minLength:"1" maxLength:"100"`
	Bytes       string  `json:"bytes" minLength:"1"`
	FolderID    *string `json:"folderId,omitempty"`
}

type CreateFolderRequest struct {
	ShowVersion    int    `json:"showVersion,omitempty"`
	ParentFolderID string `json:"parentFolderId,omitempty"`
	Name           string `json:"name" maxLength:"100"`
}

type DeleteEntryRequest struct {
	ShowVersion int  `json:"showVersion,omitempty"`
	IsDirectory bool `json:"isDirectory,omitempty"`
}

type RenameEntryRequest struct {
	ShowVersion int    `json:"showVersion,omitempty"`
	IsDirectory bool   `json:"isDirectory,omitempty"`
	NewName     string `json:"newName" maxLength:"100"`
}

type MoveAssetRequest struct {
	ShowVersion    int    `json:"showVersion,omitempty"`
	AssetID        string `json:"assetId,omitempty"`
	TargetFolderID string `json:"targetFolderId"`
}

type TransferEntryRequest struct {
	ShowVersion    int     `json:"showVersion,omitempty"`
	IsDirectory    bool    `json:"isDirectory,omitempty"`
	TargetFolderID *string `json:"targetFolderId,omitempty"`
	Copy           bool    `json:"copy,omitempty"`
}
