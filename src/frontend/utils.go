package frontend

import (
	"net/http"
	"path/filepath"
)

const frontendFolder = "frontend"

func From(partsOfPath ...string) string {
	return filepath.Join(append([]string{frontendFolder}, partsOfPath...)...)
}

func FileServer(partsOfPath ...string) http.Handler {
	return http.FileServer(http.Dir(From(partsOfPath...)))
}
