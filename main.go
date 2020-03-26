package main

import (
	"encoding/json"
	"io/ioutil"
	"log"
	"net/http"
	"onlineboard/src/boardlist"
	"time"

	"github.com/gorilla/mux"
)

type CreateMessage struct {
	Parent string          `json:"parent"`
	Value  json.RawMessage `json:"value"`
}

type MoveMessage struct {
	Parent string `json:"parent"`
}

func main() {
	r := mux.NewRouter()
	bl := boardlist.New()

	r.HandleFunc(`/`, func(writer http.ResponseWriter, request *http.Request) {
		http.ServeFile(writer, request, "./dist/index.html")
	})

	r.Methods("GET").Path("/board/{boardid}").HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		if bl.ExistBoard(mux.Vars(request)["boardid"]) {
			http.ServeFile(writer, request, "./dist/board.html")
		} else {
			http.Redirect(writer, request, "/", 303)
		}
	})

	r.HandleFunc("/new", func(w http.ResponseWriter, r *http.Request) {
		boardid := bl.CreateBoard()
		http.Redirect(w, r, "/board/"+boardid, 303)
	})

	r.HandleFunc("/board/{boardid}/socket", bl.MakeEchoSocket())

	r.Methods("POST").Path("/board/load").HandlerFunc(
		func(w http.ResponseWriter, r *http.Request) {
			b, err := ioutil.ReadAll(r.Body)
			defer r.Body.Close()
			if err != nil {
				http.Error(w, err.Error(), 500)
				return
			}

			var msg []json.RawMessage
			err = json.Unmarshal(b, &msg)
			if err != nil {
				http.Error(w, err.Error(), 500)
				return
			}

			boardid := bl.LoadBoard(msg)
			http.Redirect(w, r, "/board/"+boardid, 303)
		})

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
				http.Error(w, err.Error(), 400)
				return
			}
		})
	r.PathPrefix("/").Handler(http.FileServer(http.Dir("./dist")))
	srv := &http.Server{
		Handler: r,
		Addr:    "0.0.0.0:3000",
		// Good practice: enforce timeouts for servers you create!
		WriteTimeout: 15 * time.Second,
		ReadTimeout:  15 * time.Second,
	}
	log.Fatal(srv.ListenAndServe())
}
