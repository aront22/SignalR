using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace ChattR.Models
{
    public class Message
    {
        public string SenderId { get; set; }
        public string SenderName { get; set; }
        public string Text { get; set; }
        public DateTimeOffset PostedDate { get; set; }
    }
}
