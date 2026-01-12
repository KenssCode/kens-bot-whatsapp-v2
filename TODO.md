# TODO - Add Group Features

## Task: Add .h (hidetag), .tagall (tagall), .close (admin-only) features

### Files Created:

- [x] src/commands/hidetag.js - Command `.h` for hidden mentions
- [x] src/commands/tagall.js - Command `.tagall` for tagging all members
- [x] src/commands/close.js - Command `.close` to restrict messages to admins
- [x] src/commands/open.js - Command `.open` to open group (complementary command)

### Features Implemented:

- `.h` - Tag all members with hidden text (mentions without visible names)
- `.tagall` - Tag all members with visible mentions
- `.close` - Restrict group messages to admin only
- `.open` - Open group for all members to send messages

### Notes:

- All commands work only in groups
- `.close` and `.open` require bot to be admin
- `.close` and `.open` require sender to be admin
- Commands are properly integrated with existing handler system
