package main

import "fmt"

type App struct{}

func NewApp() *App { return &App{} }

func main() { fmt.Println("TGB Resolver Server (go)") }
