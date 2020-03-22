package main

import (
	"encoding/json"
	"io/ioutil"
	"log"
	"net/http"
	"onlineboard/src/boardlist"
	"onlineboard/src/frontend"
	"time"

	"github.com/gorilla/mux"
)

type CreateMessage struct {
	Parent int             `json:"parent"` //	TODO
	Value  json.RawMessage `json:"value"`
}

type MoveMessage struct {
	Parent string `json:"parent"`
}

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

	//	TODO
	r.HandleFunc("/socket/{boardid}", bl.MakeEchoSocket())

	r.Methods("POST").Path("/board/{boardid}/line").HandlerFunc(
		func(w http.ResponseWriter, r *http.Request) {
			b, err := ioutil.ReadAll(r.Body)
			defer r.Body.Close()
			if err != nil {
				http.Error(w, err.Error(), 500)
				return
			}

			var msg CreateMessage
			err = json.Unmarshal(b, &msg)
			if err != nil {
				http.Error(w, err.Error(), 500)
				return
			}

			log.Println(msg)

			output, err := bl.CreateLine(mux.Vars(r)["boardid"], string(msg.Parent), msg.Value)

			if err != nil {
				http.Error(w, err.Error(), 500)
				return
			}

			w.Write([]byte(output))
		})

	r.Methods("DELETE").Path("/board/{boardid}/line/{lineid}").HandlerFunc(
		func(w http.ResponseWriter, r *http.Request) {

			mapa := mux.Vars(r)
			boardid := mapa["boardid"]
			lineid := mapa["lineid"]
			err := bl.DeleteLine(boardid, lineid)

			if err != nil {
				http.Error(w, err.Error(), 500)
				return
			}
		})

	log.Fatal(srv.ListenAndServe())
}

func makeStaticRouter() *mux.Router {
	r := mux.NewRouter()
	r.Handle(`/{file:.+\.(?:ico|jpe?g|png|gif|bmp)}`, frontend.FileServer("assets", "images"))
	r.Handle(`/{file:.+\.css}`, frontend.FileServer("assets", "styles"))
	return r
}
