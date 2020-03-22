package main

import (
	"log"
	"net/http"
	"onlineboard/src/boardlist"
	"onlineboard/src/frontend"
	"time"

	"github.com/gorilla/mux"
)

func main() {
	r := mux.NewRouter()
	r.HandleFunc("/", func(writer http.ResponseWriter, request *http.Request) {
		http.ServeFile(writer, request, frontend.From("static", "index.html"))
	})
	r.HandleFunc("/board/{id}", func(writer http.ResponseWriter, request *http.Request) {
		http.ServeFile(writer, request, frontend.From("static", "desk.html"))
	})
	r.PathPrefix("/static/").Handler(http.StripPrefix("/static", makeStaticRouter()))
	r.PathPrefix("/dist").Handler(http.StripPrefix("/dist", frontend.FileServer("/dist")))
	srv := &http.Server{
		Handler: r,
		Addr:    "0.0.0.0:3000",
		// Good practice: enforce timeouts for servers you create!
		WriteTimeout: 15 * time.Second,
		ReadTimeout:  15 * time.Second,
	}

	bl := boardlist.New()

	r.HandleFunc("/new", func(w http.ResponseWriter, r *http.Request) {
		boardid := bl.CreateBoard()
		http.Redirect(w, r, "/board/"+boardid, 303)
	})

	r.HandleFunc("/socket/{boardid}", bl.MakeEchoSocket())
	log.Fatal(srv.ListenAndServe())
}

func makeStaticRouter() *mux.Router {
	r := mux.NewRouter()
	r.Handle(`/{file:.+\.(?:ico|jpe?g|png|gif|bmp)}`, frontend.FileServer("assets", "images"))
	r.Handle(`/{file:.+\.css}`, frontend.FileServer("assets", "styles"))
	return r
}
