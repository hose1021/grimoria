package main

import (
	"log"
	"os"
	"os/signal"
	"syscall"

	"pocketgrimoire/internal/app"
)

func main() {
	server, err := app.New(app.LoadConfig())
	if err != nil {
		log.Fatalf("start: %v", err)
	}

	done := make(chan os.Signal, 1)
	signal.Notify(done, os.Interrupt, syscall.SIGTERM)

	go func() {
		<-done
		server.Shutdown()
	}()

	if err := server.Run(); err != nil {
		log.Fatalf("serve: %v", err)
	}
}
