package auth

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"strings"
	"sync"
	"time"

	"github.com/uptrace/bun"
)

var (
	ErrInvalidCode  = errors.New("invalid join code")
	ErrInvalidToken = errors.New("invalid session token")
	ErrExpired      = errors.New("session expired")
)

const crockford = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"

func NormalizeCode(code string) string {
	var out strings.Builder
	for _, r := range strings.ToUpper(strings.TrimSpace(code)) {
		switch r {
		case 'O':
			out.WriteRune('0')
		case 'I', 'L':
			out.WriteRune('1')
		case '-', ' ':
			continue
		default:
			out.WriteRune(r)
		}
	}
	return out.String()
}

func GenerateJoinCode() string {
	b := make([]byte, 6)
	if _, err := rand.Read(b); err != nil {
		panic(err)
	}
	out := make([]byte, 6)
	for i, v := range b {
		out[i] = crockford[int(v)%32]
	}
	return string(out)
}

func codesEqual(a, b string) bool {
	an, bn := NormalizeCode(a), NormalizeCode(b)
	if len(an) != len(bn) {
		return false
	}
	return subtle.ConstantTimeCompare([]byte(an), []byte(bn)) == 1
}

func hashToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}

func randomToken() (string, error) {
	raw := make([]byte, 32)
	if _, err := rand.Read(raw); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(raw), nil
}

func randomID() (string, error) {
	raw := make([]byte, 16)
	if _, err := rand.Read(raw); err != nil {
		return "", err
	}
	return hex.EncodeToString(raw), nil
}

type JoinOutput struct {
	Token     string
	SessionID string
	Label     string
	ExpiresAt time.Time
}

type SessionInfo struct {
	ID        string
	Label     string
	CreatedAt time.Time
	LastSeen  time.Time
	ExpiresAt time.Time
}

func toInfo(sess AuthSession) SessionInfo {
	return SessionInfo{
		ID:        sess.ID,
		Label:     sess.Label,
		CreatedAt: time.UnixMilli(sess.CreatedAtMs),
		LastSeen:  time.UnixMilli(sess.LastSeenMs),
		ExpiresAt: time.UnixMilli(sess.ExpiresAtMs),
	}
}

type Service struct {
	db       *bun.DB
	seedCode string
	ttl      time.Duration
	now      func() time.Time
	mu       sync.Mutex
}

func NewService(db *bun.DB, seedCode string, ttl time.Duration, now func() time.Time) *Service {
	if now == nil {
		now = time.Now
	}
	return &Service{db: db, seedCode: seedCode, ttl: ttl, now: now}
}

func (s *Service) Migrate(ctx context.Context) error {
	for _, model := range []any{(*AuthState)(nil), (*AuthSession)(nil)} {
		if _, err := s.db.NewCreateTable().Model(model).IfNotExists().Exec(ctx); err != nil {
			return err
		}
	}
	return nil
}

func (s *Service) EnsureSeeded(ctx context.Context) (string, error) {
	if err := s.Migrate(ctx); err != nil {
		return "", err
	}
	exists, err := s.db.NewSelect().Model((*AuthState)(nil)).Where("id = ?", localAuthID).Exists(ctx)
	if err != nil {
		return "", err
	}
	if exists {
		return "", nil
	}
	code := NormalizeCode(s.seedCode)
	fresh := ""
	if code == "" {
		code = GenerateJoinCode()
		fresh = code
	}
	nowMs := s.now().UnixMilli()
	_, err = s.db.NewInsert().Model(&AuthState{
		ID: localAuthID, JoinCode: code,
		CreatedAtMs: nowMs, RotatedAtMs: nowMs,
	}).Exec(ctx)
	if err != nil {
		return "", err
	}
	return fresh, nil
}

func (s *Service) CurrentCode(ctx context.Context) (string, error) {
	var state AuthState
	if err := s.db.NewSelect().Model(&state).Where("id = ?", localAuthID).Scan(ctx); err != nil {
		return "", err
	}
	return state.JoinCode, nil
}

func (s *Service) Join(ctx context.Context, code string) (JoinOutput, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	var state AuthState
	if err := s.db.NewSelect().Model(&state).Where("id = ?", localAuthID).Scan(ctx); err != nil {
		return JoinOutput{}, err
	}
	if !codesEqual(code, state.JoinCode) {
		return JoinOutput{}, ErrInvalidCode
	}
	token, err := randomToken()
	if err != nil {
		return JoinOutput{}, err
	}
	id, err := randomID()
	if err != nil {
		return JoinOutput{}, err
	}
	now := s.now()
	label := ""
	for i := 0; i < 8; i++ {
		candidate := GenerateLabel()
		exists, err := s.db.NewSelect().Model((*AuthSession)(nil)).Where("label = ?", candidate).Exists(ctx)
		if err != nil {
			return JoinOutput{}, err
		}
		if !exists {
			label = candidate
			break
		}
	}
	if label == "" {
		label = GenerateLabel()
	}
	expires := now.Add(s.ttl)
	_, err = s.db.NewInsert().Model(&AuthSession{
		ID: id, TokenHash: hashToken(token), Label: label,
		CreatedAtMs: now.UnixMilli(), ExpiresAtMs: expires.UnixMilli(),
		LastSeenMs: now.UnixMilli(),
	}).Exec(ctx)
	if err != nil {
		return JoinOutput{}, err
	}
	return JoinOutput{Token: token, SessionID: id, Label: label, ExpiresAt: expires}, nil
}

func (s *Service) Verify(token string) (SessionInfo, error) {
	ctx := context.Background()
	var sess AuthSession
	if err := s.db.NewSelect().Model(&sess).Where("token_hash = ?", hashToken(token)).Scan(ctx); err != nil {
		return SessionInfo{}, ErrInvalidToken
	}
	nowMs := s.now().UnixMilli()
	if nowMs > sess.ExpiresAtMs {
		return SessionInfo{}, ErrExpired
	}
	sess.LastSeenMs = nowMs
	_, _ = s.db.NewUpdate().Model(&sess).Column("last_seen_ms").Where("id = ?", sess.ID).Exec(ctx)
	return toInfo(sess), nil
}

func (s *Service) Rotate(ctx context.Context) (string, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	code := GenerateJoinCode()
	_, err := s.db.NewUpdate().Model((*AuthState)(nil)).
		Set("join_code = ?", code).
		Set("rotated_at_ms = ?", s.now().UnixMilli()).
		Where("id = ?", localAuthID).Exec(ctx)
	if err != nil {
		return "", err
	}
	return code, nil
}

func (s *Service) List(ctx context.Context) ([]SessionInfo, error) {
	var sessions []AuthSession
	if err := s.db.NewSelect().Model(&sessions).Order("created_at_ms ASC").Scan(ctx); err != nil {
		return nil, err
	}
	out := make([]SessionInfo, 0, len(sessions))
	for _, sess := range sessions {
		out = append(out, toInfo(sess))
	}
	return out, nil
}

func (s *Service) Revoke(ctx context.Context, id string) error {
	res, err := s.db.NewDelete().Model((*AuthSession)(nil)).Where("id = ?", id).Exec(ctx)
	if err != nil {
		return err
	}
	n, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if n == 0 {
		return ErrInvalidToken
	}
	return nil
}

func (s *Service) PurgeExpired(ctx context.Context) (int, error) {
	res, err := s.db.NewDelete().Model((*AuthSession)(nil)).Where("expires_at_ms <= ?", s.now().UnixMilli()).Exec(ctx)
	if err != nil {
		return 0, err
	}
	n, err := res.RowsAffected()
	if err != nil {
		return 0, err
	}
	return int(n), nil
}
