import { embedBuilder } from "../utils/embeds";
import { commandBuilder, safeReply } from "../utils/general";
import { Subcommand } from "../utils/typesAndInterfaces";

const eatGifLinks: string[] = [
  'https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExemhjdXlwcXE5eWt3dzIzODFneGVrdmhheGdwZ3Jia2xuaXZraTN6dyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/d2ItDZZumUI6Y/giphy.gif',
  'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExejU3aGhmaWVtOW8xOHJkazVleWg2dXZrMmdmM3N6M3Z5dTFqczMxeCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/CM1JR5qvYdvGLhk1fj/giphy.gif',
  'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExYm1uajB1eTJjN2p1cGs1MjB6aDZjbWNqcGxibGIyYXQyeDh4OGhkbSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/ef61oIGVyckY8/giphy.gif'
];

export const howToCommands = commandBuilder(
  'howto',
  'All howto commands',
  async () => {},
  false,
  'user',
  (builder) => builder,
  new Map<string, Subcommand>(
    [
      [
        'breath',
        {
          name: 'breath',
          description: 'How does one breath',
          async execute(interaction) {
            await safeReply(interaction, 'inhale, exhale ez😎');
          },
          permissionLevel: 'user',
          guildOnly: false,
        },
      ],
      [
        'eat',
        {
          name: 'eat',
          description: 'How does one eat',
          async execute(interaction) {
            
            const randomNum = Math.floor(Math.random() * eatGifLinks.length);

            const embed = embedBuilder(
              {
                title: 'How to eat:',
                customize: (builder) => builder.setImage(eatGifLinks[randomNum]),
              }
            )
            await safeReply(interaction, '',false,[embed]);
          },
          permissionLevel: 'user',
          guildOnly: false,
        },
      ]
    ]
  )
);