import { Component, OnInit, Input } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AuthorizeService } from '../../api-authorization/authorize.service';
import { Message } from '../models';

@Component({
  selector: 'app-chat-stream',
  templateUrl: './chat-stream.component.html',
  styleUrls: ['./chat-stream.component.css']
})
export class ChatStreamComponent implements OnInit {
  @Input() messages: Message[];
  public userName: string | null | undefined;

  constructor(private authorizeService: AuthorizeService) { }

  ngOnInit() {
    this.authorizeService.getUser().pipe(map(u => u && u.name))
      .subscribe(u => {
        this.userName = u;
      });
  }

  isOwnMessage(message: Message) {

    return message.senderName === this.userName;
  }
}
