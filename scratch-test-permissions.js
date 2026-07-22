const { PermissionFlagsBits } = require('discord.js');

function parsePermissions(permsInput) {
  if (!permsInput) return [];
  const permsArray = Array.isArray(permsInput) ? permsInput : [permsInput];

  if (permsArray.some(p => typeof p === 'string' && ['all', 'tout', 'toutes', 'all_permissions', 'full'].includes(p.toLowerCase().trim()))) {
    return Object.values(PermissionFlagsBits).filter(v => typeof v === 'bigint');
  }

  const resolved = [];

  const PERM_LOOKUP = {
    'administrator': PermissionFlagsBits.Administrator,
    'admin': PermissionFlagsBits.Administrator,
    'manageguild': PermissionFlagsBits.ManageGuild,
    'manageserver': PermissionFlagsBits.ManageGuild,
    'gererserveur': PermissionFlagsBits.ManageGuild,
    'manageroles': PermissionFlagsBits.ManageRoles,
    'gererroles': PermissionFlagsBits.ManageRoles,
    'managechannels': PermissionFlagsBits.ManageChannels,
    'gerersalons': PermissionFlagsBits.ManageChannels,
    'kickmembers': PermissionFlagsBits.KickMembers,
    'expulser': PermissionFlagsBits.KickMembers,
    'banmembers': PermissionFlagsBits.BanMembers,
    'bannir': PermissionFlagsBits.BanMembers,
    'moderatemembers': PermissionFlagsBits.ModerateMembers,
    'timeoutmembers': PermissionFlagsBits.ModerateMembers,
    'timeout': PermissionFlagsBits.ModerateMembers,
    'exclure': PermissionFlagsBits.ModerateMembers,
    'excluretemporairement': PermissionFlagsBits.ModerateMembers,
    'exclusiontemporaire': PermissionFlagsBits.ModerateMembers,
    'sendmessages': PermissionFlagsBits.SendMessages,
    'envoyermessages': PermissionFlagsBits.SendMessages,
    'managemessages': PermissionFlagsBits.ManageMessages,
    'gerermessages': PermissionFlagsBits.ManageMessages,
    'epingler': PermissionFlagsBits.ManageMessages,
    'epinglermessages': PermissionFlagsBits.ManageMessages,
    'pinmessages': PermissionFlagsBits.ManageMessages,
    'ignorermodelent': PermissionFlagsBits.ManageMessages,
    'bypassslowmode': PermissionFlagsBits.ManageMessages,
    'readmessagehistory': PermissionFlagsBits.ReadMessageHistory,
    'voirhistorique': PermissionFlagsBits.ReadMessageHistory,
    'mentioneveryone': PermissionFlagsBits.MentionEveryone,
    'mentionnertoutlemonde': PermissionFlagsBits.MentionEveryone,
    'managethreads': PermissionFlagsBits.ManageThreads,
    'gererfils': PermissionFlagsBits.ManageThreads,
    'gererlesfils': PermissionFlagsBits.ManageThreads,
    'createpublicthreads': PermissionFlagsBits.CreatePublicThreads,
    'createprivatethreads': PermissionFlagsBits.CreatePrivateThreads,
    'sendmessagesinthreads': PermissionFlagsBits.SendMessagesInThreads,
    'createguildexpressions': PermissionFlagsBits.CreateGuildExpressions || PermissionFlagsBits.ManageEmojisAndStickers,
    'creerexpressions': PermissionFlagsBits.CreateGuildExpressions || PermissionFlagsBits.ManageEmojisAndStickers,
    'manageguildexpressions': PermissionFlagsBits.ManageGuildExpressions || PermissionFlagsBits.ManageEmojisAndStickers,
    'gererexpressions': PermissionFlagsBits.ManageGuildExpressions || PermissionFlagsBits.ManageEmojisAndStickers,
    'manageemojisandstickers': PermissionFlagsBits.ManageEmojisAndStickers,
    'gereremojis': PermissionFlagsBits.ManageEmojisAndStickers,
    'useexternalemojis': PermissionFlagsBits.UseExternalEmojis,
    'useexternalstickers': PermissionFlagsBits.UseExternalStickers,
    'createevents': PermissionFlagsBits.CreateEvents || PermissionFlagsBits.ManageEvents,
    'creerevenements': PermissionFlagsBits.CreateEvents || PermissionFlagsBits.ManageEvents,
    'manageevents': PermissionFlagsBits.ManageEvents,
    'gererevenements': PermissionFlagsBits.ManageEvents,
    'evenements': PermissionFlagsBits.ManageEvents,
    'connect': PermissionFlagsBits.Connect,
    'seconnecter': PermissionFlagsBits.Connect,
    'speak': PermissionFlagsBits.Speak,
    'parler': PermissionFlagsBits.Speak,
    'priorityspeaker': PermissionFlagsBits.PrioritySpeaker,
    'voixprioritaire': PermissionFlagsBits.PrioritySpeaker,
    'mutemembers': PermissionFlagsBits.MuteMembers,
    'muter': PermissionFlagsBits.MuteMembers,
    'deafenmembers': PermissionFlagsBits.DeafenMembers,
    'assourdir': PermissionFlagsBits.DeafenMembers,
    'movemembers': PermissionFlagsBits.MoveMembers,
    'deplacer': PermissionFlagsBits.MoveMembers,
    'viewchannel': PermissionFlagsBits.ViewChannel,
    'voirsalons': PermissionFlagsBits.ViewChannel,
    'embedlinks': PermissionFlagsBits.EmbedLinks,
    'integrerliens': PermissionFlagsBits.EmbedLinks,
    'attachfiles': PermissionFlagsBits.AttachFiles,
    'joindrefichiers': PermissionFlagsBits.AttachFiles,
    'useapplicationcommands': PermissionFlagsBits.UseApplicationCommands,
    'stream': PermissionFlagsBits.Stream,
    'video': PermissionFlagsBits.Stream
  };

  permsArray.forEach(perm => {
    if (typeof perm !== 'string') return;
    const cleanKey = perm.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    if (PERM_LOOKUP[cleanKey]) {
      resolved.push(PERM_LOOKUP[cleanKey]);
    } else if (PermissionFlagsBits[perm]) {
      resolved.push(PermissionFlagsBits[perm]);
    }
  });

  return resolved;
}

console.log('Testing "all":', parsePermissions(['all']).length, 'permissions found.');
console.log('Testing French terms (epingler, exclure temporairement, gerer les fils, voix prioritaire, evenements, gerer les expressions):');
const testTerms = ['epingler', 'exclure temporairement', 'gerer les fils', 'voix prioritaire', 'evenements', 'gerer les expressions'];
const res = parsePermissions(testTerms);
console.log('Resolved count:', res.length, 'out of', testTerms.length);
console.log('Resolved flags:', res);
