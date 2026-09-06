package show

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"

	"github.com/zeebo/xxh3"
)

func newID() string {
	var b [16]byte
	_, _ = rand.Read(b[:])
	return hex.EncodeToString(b[:])
}

func xxh3Hex(data []byte) string {
	return fmt.Sprintf("%016X", xxh3.Hash(data))
}
