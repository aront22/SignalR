using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace ChattR.Models
{
    public class Room
    {
        public string Name { get; set; }
        public DateTimeOffset CreationDate { get; set; }
        public bool RequiresPasskey { get; set; }
    }
}
