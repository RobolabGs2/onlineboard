package frontend

import "path/filepath"

const frontendFolder = "frontend"

func FromFrontend(partsOfPath ...string) string {
	return filepath.Join(append([]string{frontendFolder}, partsOfPath...)...)
}
