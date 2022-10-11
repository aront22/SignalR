using ChattR.Models;

namespace ChattR.Hubs
{
    public interface IChattRClient
    {
        Task RoomCreated(Room room);
        Task RoomAbandoned(string roomName);
        Task UserEntered(User user);
        Task UserLeft(string userId);
        Task RecieveMessage(Message message);
        Task SetUsers(List<User> users);
        Task SetMessages(List<Message> messages);

    }
}