//go:build tools

package main

import (
	_ "github.com/google/wire/cmd/wire"
	_ "google.golang.org/protobuf/cmd/protoc-gen-go"
)
