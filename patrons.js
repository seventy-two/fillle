// The bar's regulars. One walks up each day. Each art string starts and
// ends with a newline (trimmed off) so a line can end in a backslash.

export const PATRONS = [
  {
    name: "Jef",
    art: String.raw`
   _____
  /     \
 |  o o  |
 |   >   |
 |  \_/  |
  \_____/
  /|   |\
   |___|
`.slice(1, -1),
  },
  {
    name: "Brother Benedict",
    art: String.raw`
   .---.
  / ___ \
 | (o o) |
 |   ^   |
  \ '-' /
  /'---'\
 / |   | \
   |___|
`.slice(1, -1),
  },
  {
    name: "Lotte",
    art: String.raw`
   ,,,,,
  ((o o))
  ((  >))
   ( - )
  /|   |\
 / |   | \
   /___\
`.slice(1, -1),
  },
  {
    name: "Wouter",
    art: String.raw`
  _______
 |_______|
  [o]-[o]
 |   >   |
 |  ---  |
  \_____/
  /|   |\
   |___|
`.slice(1, -1),
  },
  {
    name: "Marieke",
    art: String.raw`
   .-"-.
  / o o \
 |   <   |
  \ \_/ /
  /'---'\
 /|  *  |\
   |___|
`.slice(1, -1),
  },
  {
    name: "Pieter",
    art: String.raw`
   _____
  |o   o|
  |  L  |
  | ### |
  |#####|
  /|###|\
   |___|
`.slice(1, -1),
  },
  {
    name: "Els",
    art: String.raw`
  @@@@@@@
 @@ ^ ^ @@
 @@  >  @@
  @ \_/ @
   /---\
  /|   |\
   |___|
`.slice(1, -1),
  },
  {
    name: "Hendrik",
    art: String.raw`
    __
  _/  \_
 (_o__o_)
  |  >  |
  | ~~~ |
  /'---'\
 /|  o  |\
   |___|
`.slice(1, -1),
  },
];
