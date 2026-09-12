package auth

import (
	"crypto/rand"
	"fmt"
	"math/big"
)

var adjectives = []string{
	"brave", "swift", "quiet", "amber", "cobalt", "daring", "eager", "frosty",
	"golden", "harbor", "ivory", "jolly", "keen", "lunar", "merry", "noble",
}

var nouns = []string{
	"fox", "heron", "otter", "raven", "badger", "comet", "dune", "ember",
	"finch", "grove", "harp", "ibis", "jay", "koala", "lark", "mole",
}

func GenerateLabel() string {
	return fmt.Sprintf("%s-%s", pick(adjectives), pick(nouns))
}

func pick(words []string) string {
	v, err := rand.Int(rand.Reader, big.NewInt(int64(len(words))))
	if err != nil {
		panic(err)
	}
	return words[v.Int64()]
}
