import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Message, User } from '../models';
import { HubBuilderService } from '../services/hub-builder.service.spec';

@Component({
  selector: 'app-room',
  templateUrl: './room.component.html',
  styleUrls: ['./room.component.css']
})
export class RoomComponent implements OnInit {
  id: string;

  roomMessages: Message[];
  chatMessage: string;
  peeps: User[];

  connection: signalR.HubConnection;

  constructor(hubBuilder: HubBuilderService, private route: ActivatedRoute) {
    route.params.subscribe(p => {
      this.id = p["id"];
    });
    
    this.connection = hubBuilder.getConnection();

    this.connection.on("SetUsers", users => this.setUsers(users));
    this.connection.on("UserEntered", user => this.userEntered(user));
    this.connection.on("UserLeft", userId => this.userLeft(userId));
    this.connection.on("SetMessages", messages => this.setMessages(messages));
    this.connection.on("RecieveMessage", message => this.recieveMessage(message));

    this.roomMessages = [];

    this.connection.start();
  }

  ngOnInit() {
  }

  recieveMessage(message: Message) {
    // A szerver új üzenet érkezését jelzi:
    this.roomMessages.splice(0, 0, message);
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
    this.roomMessages = messages;
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

}
