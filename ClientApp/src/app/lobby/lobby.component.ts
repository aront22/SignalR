import { Component, OnInit, OnDestroy } from '@angular/core';
import { Room, User, Message } from '../models';
import * as signalR from '@microsoft/signalr';
import { HubBuilderService } from '../services/hub-builder.service.spec';
import { RoomComponent } from '../room/room.component';
import { Router } from '@angular/router';

@Component({
  selector: 'app-lobby',
  templateUrl: './lobby.component.html',
  styleUrls: ['./lobby.component.css']
})
export class LobbyComponent implements OnInit, OnDestroy {
  activeTab: 'rooms' | 'peeps' = 'peeps';

  rooms: Room[];
  peeps: User[];

  newRoomName: string;
  newRoomIsPrivate: boolean = false;
  newRoomPasskey: string;

  lobbyMessages: Message[];
  lobbyLoading: boolean = false;

  chatMessage: string;

  connection: signalR.HubConnection; // Ne felejtsük el, hogy a kettősponttal történő deklaráció csak
  // a típust deklarálja, értéket nem ad a változónak!

  constructor(hubBuilder: HubBuilderService, private router: Router) {
    this.connection = hubBuilder.getConnection();
    // Beregisztráljuk a szervertől érkező üzenetek eseménykezelőjét. Típusosan is tudnánk kezelni egy
    // olyan objektum tulajdonságainak bejárásával, aminek tulajdonságai az eseménykezelők.
    this.connection.on("SetUsers", users => this.setUsers(users));
    this.connection.on("UserEntered", user => this.userEntered(user));
    this.connection.on("UserLeft", userId => this.userLeft(userId));
    this.connection.on("SetMessages", messages => this.setMessages(messages));
    this.connection.on("RecieveMessage", message => this.recieveMessage(message));
    this.connection.on("RoomCreated", room => this.roomCreated(room));
    this.connection.on("RoomAbandoned", room => this.roomAbandoned(room));
    // TODO: További eseménykezelőket is kell majd beregisztrálnunk itt.
    this.peeps = [];
    this.lobbyMessages = [];
    this.rooms = [];
    this.connection.start().then(() => {
      this.connection.invoke("EnterLobby");
    });
  }
  ngOnInit() { /* A korábbi mock adatokat töröljük */ }
  ngOnDestroy() {
    
  }


  recieveMessage(message: Message) {
    // A szerver új üzenet érkezését jelzi:
    this.lobbyMessages.splice(0, 0, message);
    console.log(`[lobby] - ${message.senderName} : ${message.text}`);
  }

  userEntered(user: User) {
    // a szerver azt jelezte, hogy az aktuális szobába csatlakozott egy user. Ezt el kell
    // tárolnunk a felhasználókat tároló tömbben.
    this.peeps.push(user);
  }

  userLeft(userId: string) {
    // a szerver azt jelezte, hogy a megadott ID-jú felhasználó elhagyta a szobát, így ki kell
    // vennünk a felhasználót a felhasználók tömbjéből ID alapján.
    this.peeps = this.peeps.filter(u => u.id !== userId);
  }

  setUsers(users: User[]) {
    // A szerver belépés után leküldi nekünk a teljes user listát:
    this.peeps = users;
  }
  setMessages(messages: Message[]) {
    // A szerver belépés után leküldi nekünk a korábban érkezett üzeneteket:
    this.lobbyMessages = messages;
  }

  sendMessage() {
    // A szervernek az invoke függvény meghívásával tudunk küldeni üzenetet.
    this.connection.invoke("SendMessageToLobby", this.chatMessage);
    // A kérés szintén egy Promise, tehát feliratkoztathatnánk rá eseménykezelőt, ami akkor sül el, ha
    // a szerver jóváhagyta a kérést (vagy esetleg hibára futott). A szerver egyes metódusai Task
    // helyett Task<T>-vel is visszatérhetnek, ekkor a válasz eseménykezelőjében megkapjuk a válasz
    // objektumot is:
    // this.connection.invoke("SendMessageToLobby", this.chatMessage)
    // .then((t: T) => {
    // console.log(t);
    // })
    // .catch(console.error);
    this.chatMessage = "";
  }

  createRoom() {
    // TODO: szoba létrehozása szerveren, majd navigáció a szoba útvonalára, szükség esetén megadni a passkey-t
    let pass = this.newRoomIsPrivate ? this.newRoomPasskey : "";
    this.connection.invoke<Room>("CreateRoom", this.newRoomName, pass).then(r =>{
      this.router.navigate(["/room", r.name]);
    })
    .catch(console.error);
  }

  roomCreated(room: Room) {
    // TODO: szobalista frissítése
    this.rooms.push(room);
  }

  roomAbandoned(roomName: string) {
    // TODO: szobalista frissítése
    this.rooms = this.rooms.filter(r => r.name !== roomName);
  }

  enterRoom(room: Room) {
    // TODO: navigáció a szoba útvonlára, figyelve, hogy kell-e megadni passkey-t
    const pass = room.requiresPasskey ? this.newRoomPasskey : "";
    this.connection.invoke("EnterRoom", room.name, pass).then(_ => {
      this.router.navigate(["/room", room.name]);
    })
    .catch(console.error);
  }
}
