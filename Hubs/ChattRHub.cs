using ChattR.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace ChattR.Hubs
{
    [Authorize]
    public class ChattRHub : Hub<IChattRClient>
    {
        public const string LobbyRoomName = "ChattRLobby";
        public static HubRoom Lobby { get; } = new HubRoom
        {
            Name = LobbyRoomName
        };

        public static Dictionary<string, HubRoom> Rooms { get; set; }
            = new Dictionary<string, HubRoom>();

        public class HubRoom
        {
            public string Name { get; set; }
            public string CreatorId { get; set; }
            public string Passkey { get; set; }
            public List<Message> Messages { get; } = new List<Message>();
            public List<User> Users { get; } = new List<User>();
        }
        // Ahhoz hogy működjön a Context.UserIdentifier,
        // külön kellene implementálni az IUserIdProvider interfészt
        // https://stackoverflow.com/a/63059742/1406798
        private string CurrentUserId => Context.User.FindFirst("sub").Value;
        // TODO: a szobakezelést érdemes a beépített Group mechanizmus segítségével kezelni, de az
        // kizárólag a klienseknek történő válaszok küldésére használható. A Group ID alapján
        // automatikusan "létrejön", ha egy felhasználó belép, és "megszűnik", ha az utolsó is kilép.
        // Ezért szükséges egy saját adatstruktúrában is eltárolnunk a szobákat, hogy a felhasználók
        // adatait és a korábbi üzeneteket meg tudjuk jegyezni. A ChattRHub nem singleton, minden
        // kéréshez egy ChattRHub objektum példányosodik. A legegyszerűbb megoldás egy statikus
        // objektumban tárolni itt az adatokat, de ez éles környezetben nem lenne optimális, helyette
        // egy singleton service-ben kellene az adatokat kezelnünk. A laboron a statikus megoldás
        // teljesen megfelel, de legyünk tisztában a "static smell" jelenséggel; állapotot megosztani
        // explicit érdemes, tehát függőséginjektálással, nem "láthatatlan" statikus függőségekkel.
        public async Task EnterLobby()
        {
            var user = new User { Id = CurrentUserId, Username = Context.User.Identity.Name };
            Lobby.Users.Add(user);
            // Megvizsgálhatjuk a Client objekumot: ezen keresztül érjük el a hívó klienst (Caller),
            // adott klienseket tudunk megszólítani pl. ConnectionId vagy UserIdentifier alapján, vagy
            // használhatjuk a beépített csoport (Group) mechanizmust felhasználói csoportok kezelésére.
            await Clients.Group(LobbyRoomName)
            // A Client típusunk a fent megadott típusparaméter, ezeket a függvényeket tudjuk
            // meghívni a kliense(ke)n.
            .UserEntered(user);
            await Groups.AddToGroupAsync(Context.ConnectionId, LobbyRoomName);
            await Clients.Caller.SetUsers(Lobby.Users);
            await Clients.Caller.SetMessages(Lobby.Messages);
            await SendMessageToLobby($"{user.Username} has joined Lobby!");
        }

        public override async Task OnDisconnectedAsync(Exception exception)
        {
            var user = Lobby.Users.FirstOrDefault(u => u.Id == CurrentUserId);
            if (user == null)
                return;

            Lobby.Users.Remove(user);
            await SendMessageToLobby($"{user.Username} has left Lobby!");
            // TODO: később a saját szobakezelés kapcsán is kezelni kell a kilépő klienseket
            var emptyRooms = new List<HubRoom>();
            foreach (var room in Rooms)
            {
                if (room.Value.Users.Remove(user))
                {
                    await Clients.Group(LobbyRoomName).UserLeft(CurrentUserId);
                }
                if (room.Value.Users.Count == 0)
                {
                    emptyRooms.Add(room.Value);
                }
            }
            foreach (var room in emptyRooms)
            {
                await Clients.Group(LobbyRoomName).RoomAbandoned(room.Name);
                Rooms.Remove(room.Name);
            }
            await Clients.Group(LobbyRoomName).UserLeft(CurrentUserId);
            await base.OnDisconnectedAsync(exception);
        }

        public async Task SendMessageToLobby(string message)
        {
            var messageInstance = new Message
            {
                SenderId = CurrentUserId,
                SenderName = Context.User.Identity.Name,
                Text = message,
                PostedDate = DateTimeOffset.Now
            };
            Lobby.Messages.Add(messageInstance);
            await Clients.Group(LobbyRoomName).RecieveMessage(messageInstance);
        }

        public async Task SendMessageToRoom(HubRoom room, string message)
        {
            var messageInstance = new Message
            {
                SenderId = CurrentUserId,
                SenderName = Context.User.Identity.Name,
                Text = message,
                PostedDate = DateTimeOffset.Now
            };
            room.Messages.Add(messageInstance);
            await Clients.Group(room.Name).RecieveMessage(messageInstance);
        }

        public async Task<Room> CreateRoom(string name, string passkey = "")
        {
            if (Rooms.ContainsKey(name))
            {
                throw new ArgumentException($"{name} is taken");
            }

            var room = new HubRoom
            {
                Name = name,
                CreatorId = CurrentUserId,
                Passkey = passkey
            };
            Rooms.Add(name, room);
            var r = new Room
            {
                CreationDate = DateTimeOffset.Now,
                Name = name,
                RequiresPasskey = !string.IsNullOrEmpty(passkey)
            };
            await Clients.Group(LobbyRoomName).RoomCreated(r);
            return r;
        }

        public async Task EnterRoom(string roomName, string passkey = "")
        {
            if (!Rooms.TryGetValue(roomName, out var room))
                throw new ArgumentException("Invalid room name");

            if (room.Passkey != "" && room.Passkey != passkey)
                throw new ArgumentException("Invalid passkey");

            var user = new User { Id = CurrentUserId, Username = Context.User.Identity.Name };
            room.Users.Add(user);
            await Clients.Group(roomName).UserEntered(user);
            await Groups.AddToGroupAsync(Context.ConnectionId, roomName);
            await Clients.Caller.SetUsers(room.Users);
            await Clients.Caller.SetMessages(room.Messages);
            await SendMessageToRoom(room, $"{user.Username} has joined {room.Name}!");
        }
    }
}
