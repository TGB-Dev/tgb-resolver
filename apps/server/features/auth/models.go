package auth

import "github.com/uptrace/bun"

const localAuthID = "auth"

type AuthState struct {
	bun.BaseModel `bun:"table:auth_state"`
	ID            string `bun:"id,pk"`
	JoinCodeHash  string `bun:"join_code_hash"`
	CreatedAtMs   int64  `bun:"created_at_ms"`
	RotatedAtMs   int64  `bun:"rotated_at_ms"`
}

type AuthSession struct {
	bun.BaseModel `bun:"table:auth_sessions"`
	ID            string `bun:"id,pk"`
	TokenHash     string `bun:"token_hash,unique"`
	Label         string `bun:"label"`
	CreatedAtMs   int64  `bun:"created_at_ms"`
	ExpiresAtMs   int64  `bun:"expires_at_ms"`
	LastSeenMs    int64  `bun:"last_seen_ms"`
}
