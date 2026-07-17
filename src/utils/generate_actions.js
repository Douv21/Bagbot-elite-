const fs = require('fs');
const path = require('path');

const actions = [
  {
    name: '69',
    description: 'Faire un 69 avec quelqu\'un',
    title: '🍑 69',
    selfMessage: '${author} tente de faire un 69 tout seul... C\'est anatomiquement impossible !',
    targetMessage: '${author} s\'entrelace sensuellement pour un 69 torride et humide avec ${target} ! || ${author} entraîne ${target} dans un 69 brûlant et passionné... || Dans un élan de désir, ${author} et ${target} s\'unissent dans un 69 extrêmement charnel ! || Corps contre corps, tête-bêche, ${author} et ${target} partagent un 69 incroyablement torride.'
  },
  {
    name: 'agenouiller',
    description: 'S\'agenouiller devant quelqu\'un',
    title: '🧎 Agenouiller',
    selfMessage: '${author} s\'agenouille devant son reflet.',
    targetMessage: '${author} s\'agenouille amoureusement et se soumet devant ${target}. || ${author} s\'agenouille lentement devant ${target}, le regard brûlant de soumission... || Dans un geste plein de désir, ${author} s\'agenouille aux pieds de ${target}.'
  },
  {
    name: 'attrape',
    description: 'Attraper quelqu\'un',
    title: '🏃 Attraper',
    selfMessage: '${author} court en rond et s\'attrape lui-même !',
    targetMessage: '${author} attrape ${target} par la taille et le plaque contre son corps chaud ! || ${author} surgit et attrape fermement ${target} pour l\'attirer dans ses bras... || ${author} attrape sensuellement ${target} et lui murmure un secret coquin.'
  },
  {
    name: 'batailleoreiller',
    description: 'Lancer une bataille d\'oreillers',
    title: '🛌 Bataille d\'oreillers',
    selfMessage: '${author} se prend un coup d\'oreiller tout seul.',
    targetMessage: '${author} commence une bataille d\'oreillers intime avec ${target} au milieu du lit ! || Les oreillers volent entre ${author} et ${target}, se terminant dans un éclat de rire et d\'étreintes complices... || ${author} taquine ${target} avec un oreiller avant de s\'allonger à ses côtés.'
  },
  {
    name: 'branler',
    description: 'Branler quelqu\'un',
    title: '🍆 Branlette',
    selfMessage: '${author} se fait plaisir en solo...',
    targetMessage: '${author} caresse et branle chaudement le sexe de ${target} ! || La main de ${author} caresse le sexe de ${target} avec un rythme de plus en plus torride... || ${author} excite ${target} d\'une main experte et fiévreuse.'
  },
  {
    name: 'calin',
    description: 'Faire un gros câlin à quelqu\'un',
    title: '❤️ Câlin',
    selfMessage: '${author} se fait un câlin à lui-même.',
    targetMessage: '${author} enserre chaleureusement ${target} tout contre sa poitrine ! || ${author} serre tendrement ${target} contre son cœur palpitant... || ${author} enveloppe ${target} d\'une étreinte intime, douce et réconfortante.'
  },
  {
    name: 'caresser',
    description: 'Caresser doucement quelqu\'un',
    title: '🍒 Caresse',
    selfMessage: '${author} se caresse les bras doucement.',
    targetMessage: '${author} caresse lentement et sensuellement les courbes de ${target}. || Les doigts de ${author} effleurent doucement la peau frémissante de ${target}... || ${author} dessine des caresses brûlantes tout le long du corps de ${target}.'
  },
  {
    name: 'chatouiller',
    description: 'Chatouiller quelqu\'un',
    title: '👉 Chatouille',
    selfMessage: '${author} essaie de se chatouiller... Mais ça ne marche pas !',
    targetMessage: '${author} chatouille malicieusement ${target} pour entendre ses rires doux. || ${author} taquine et chatouille ${target} jusqu\'à ce qu\'il/elle demande grâce ! || ${author} se jette sur ${target} pour une séance de chatouilles complices.'
  },
  {
    name: 'collier',
    description: 'Mettre un collier à quelqu\'un',
    title: '⛓️ Collier',
    selfMessage: '${author} s\'attache un collier autour du cou.',
    targetMessage: '${author} passe doucement un collier autour du cou de ${target} pour en prendre possession. || ${author} attache un collier en cuir à ${target}, marquant leur lien charnel... || ${author} revendique ${target} en lui passant délicatement un collier autour du cou.'
  },
  {
    name: 'embrasser',
    description: 'Embrasser quelqu\'un',
    title: '💋 Bisou',
    selfMessage: '${author} embrasse son miroir.',
    targetMessage: '${author} plaque ses lèvres chaudes et embrasse goulûment ${target} ! || ${author} dépose un baiser fougueux et passionné sur les lèvres de ${target}... || Les lèvres de ${author} et ${target} s\'unissent dans un baiser sensuel et profond.'
  },
  {
    name: 'lecher',
    description: 'Lécher quelqu\'un',
    title: '👅 Lécher',
    selfMessage: '${author} se lèche le coude (quel talent !).',
    targetMessage: '${author} lèche voluptueusement la peau dorée de ${target}. || La langue de ${author} glisse doucement pour lécher ${target}... || ${author} parcourt le corps de ${target} de coups de langue sensuels et humides.'
  },
  {
    name: 'mordre',
    description: 'Mordre quelqu\'un',
    title: '🦷 Morsure',
    selfMessage: '${author} se mord la langue. Aïe !',
    targetMessage: '${author} mordille délicatement et sauvagement le cou de ${target} ! || ${author} enfonce doucement ses dents dans la chair de ${target} pour éveiller ses désirs... || Une morsure complice et coquine de ${author} fait frissonner ${target}.'
  },
  {
    name: 'mouiller',
    description: 'Mouiller quelqu\'un',
    title: '💦 Mouiller',
    selfMessage: '${author} s\'éclabousse tout seul.',
    targetMessage: '${author} excite, caresse et mouille intensément ${target} ! || ${author} fait monter la température et rend ${target} complètement mouillé(e) de désir... || Les caresses de ${author} laissent ${target} chaud(e) et trempé(e) d\'excitation.'
  },
  {
    name: 'orgasme',
    description: 'Donner un orgasme à quelqu\'un',
    title: '🥵 Orgasme',
    selfMessage: '${author} atteint le septième ciel en solo...',
    targetMessage: '${author} provoque des vagues de plaisir et fait frissonner ${target} jusqu\'à l\'orgasme ! || Sous les assauts passionnés de ${author}, ${target} succombe et explose d\'un orgasme divin... || ${author} guide ${target} jusqu\'au sommet du plaisir charnel.'
  },
  {
    name: 'punir',
    description: 'Punir quelqu\'un',
    title: '🍑 Punition',
    selfMessage: '${author} se punit lui-même.',
    targetMessage: '${author} fesse et punit avec passion ${target} ! || ${author} inflige une correction très coquette et sensuelle à ${target}... || ${author} prend le contrôle et punit fermement ${target} sous son regard soumis.'
  },
  {
    name: 'reanimer',
    description: 'Réanimer quelqu\'un',
    title: '🩺 Réanimation',
    selfMessage: '${author} se fait du bouche-à-bouche imaginaire.',
    targetMessage: '${author} réanime ${target} avec un bouche-à-bouche sensuel et profond ! || ${author} souffle un vent de passion pour réanimer ${target} au corps à corps... || Un souffle chaud de ${author} ramène ${target} à la vie avec intensité.'
  },
  {
    name: 'reconforter',
    description: 'Réconforter quelqu\'un',
    title: '🧸 Réconfort',
    selfMessage: '${author} se console tout seul.',
    targetMessage: '${author} enlace et réconforte tendrement ${target} contre son torse. || ${author} murmure des mots doux pour réconforter ${target} dans une étreinte protectrice... || ${author} offre un refuge chaleureux et complice pour réconforter ${target}.'
  },
  {
    name: 'reveiller',
    description: 'Réveiller quelqu\'un',
    title: '⏰ Réveil',
    selfMessage: '${author} sursaute au réveil.',
    targetMessage: '${author} réveille doucement ${target} avec des baisers tout au long de son corps. || ${author} réveille ${target} en caressant tendrement ses courbes sous les draps... || Des baisers coquins de ${author} viennent réveiller ${target} en douceur.'
  },
  {
    name: 'rose',
    description: 'Offrir une rose à quelqu\'un',
    title: '🌹 Offrir une rose',
    selfMessage: '${author} s\'offre une rose à lui-même.',
    targetMessage: '${author} offre une rose parfumée à ${target} pour éveiller ses désirs 🌹. || ${author} fait glisser les pétales d\'une rose sur le corps de ${target}... || ${author} séduit ${target} en lui tendant une rose rouge passion.'
  },
  {
    name: 'seduire',
    description: 'Séduire quelqu\'un',
    title: '😏 Séduction',
    selfMessage: '${author} se trouve irrésistible devant la glace.',
    targetMessage: '${author} murmure des mots doux et déploie tout son charme pour séduire ${target} ! || Le regard envoûtant de ${author} se pose sur ${target} pour le/la séduire complètement... || ${author} fait chavirer le cœur et le corps de ${target} par ses gestes charmeurs.'
  },
  {
    name: 'sodo',
    description: 'Faire une sodo à quelqu\'un',
    title: '🍑 Sodo',
    selfMessage: '${author} tente des acrobaties impossibles...',
    targetMessage: '${author} pénètre chaudement et sodo sauvagement ${target} par derrière ! || ${author} prend le contrôle de ${target} pour une sodo brûlante et haletante... || Dans une étreinte passionnée, ${author} initie une sodo torride avec ${target}.'
  },
  {
    name: 'sucer',
    description: 'Sucer quelqu\'un',
    title: '👄 Fellation',
    selfMessage: '${author} essaye mais manque de souplesse...',
    targetMessage: '${author} prend en bouche et suce goulûment le sexe de ${target} ! || Les lèvres de ${author} enveloppent et sucent sensuellement le sexe frémissant de ${target}... || ${author} offre une fellation torride et passionnée à ${target}.'
  },
  {
    name: 'tirercheveux',
    description: 'Tirer les cheveux de quelqu\'un',
    title: '💇 Tirer les cheveux',
    selfMessage: '${author} se tire les cheveux de frustration.',
    targetMessage: '${author} tire fermement les cheveux de ${target} pour incliner sa tête ! || ${author} tire doucement et sensuellement les cheveux de ${target} pour intensifier leur étreinte... || Dans un moment de passion sauvage, ${author} tire les cheveux de ${target}.'
  },
  {
    name: 'touche',
    description: 'Toucher quelqu\'un',
    title: '👉 Toucher',
    selfMessage: '${author} se touche le visage.',
    targetMessage: '${author} caresse et effleure intimement les zones érogènes de ${target}... || Les mains de ${author} parcourent et touchent sensuellement le corps de ${target}... || ${author} effleure ${target} d\'un frisson de désir en le/la touchant.'
  },
  {
    name: 'vin',
    description: 'Partager un verre de vin avec quelqu\'un',
    title: '🍷 Verre de vin',
    selfMessage: '${author} boit un verre de vin en solo. Santé !',
    targetMessage: '${author} partage un verre de vin enivrant dans une ambiance intime avec ${target} 🍷. || ${author} trinque et échange des regards complices avec ${target} autour d\'un bon vin... || ${author} et ${target} se rapprochent en dégustant un verre de vin en tête-à-tête.'
  },
  {
    name: 'danser',
    description: 'Danser avec quelqu\'un',
    title: '💃 Danse',
    selfMessage: '${author} se lance dans une danse effrénée en solo !',
    targetMessage: '${author} danse corps à corps de manière collé-serré avec ${target} ! || Dans une danse envoûtante, ${author} ondule ses hanches tout contre ${target}... || ${author} entraîne ${target} dans une danse sensuelle et rythmée.'
  },
  {
    name: 'cuisiner',
    description: 'Cuisiner pour quelqu\'un',
    title: '🍳 Cuisine Intime',
    selfMessage: '${author} se cuisine un petit plat en solo.',
    targetMessage: '${author} prépare un dîner chaud et intime pour ${target} afin de pimenter leur soirée ! || ${author} se met aux fourneaux pour séduire ${target} par ses saveurs... || ${author} prépare de douces gourmandises pour éveiller les papilles de ${target}.'
  },
  {
    name: 'deshabiller',
    description: 'Déshabiller quelqu\'un',
    title: '👙 Déshabiller',
    selfMessage: '${author} retire ses vêtements et se retrouve nu(e) devant le miroir.',
    targetMessage: '${author} retire lentement et sensuellement chaque vêtement de ${target}... || Sous le regard ardent de ${author}, ${target} se fait déshabiller pièce par pièce... || ${author} déshabille doucement ${target} pour révéler ses charmes secrets.'
  },
  {
    name: 'doigter',
    description: 'Doigter quelqu\'un',
    title: '👉 Doigté Voluptueux',
    selfMessage: '${author} explore son propre corps avec passion.',
    targetMessage: '${author} glisse ses doigts agiles et humides pour caresser intimement ${target} ! || Le rythme des doigts de ${author} fait monter le désir chez ${target}... || ${author} procure des frissons extrêmes à ${target} d\'un doigté expert.'
  },
  {
    name: 'dormir',
    description: 'Dormir avec quelqu\'un',
    title: '🛌 Sommeil Coquin',
    selfMessage: '${author} s\'endort tout(e) seul(e) avec ses fantasmes.',
    targetMessage: '${author} s\'endort tendrement enlacé(e) corps contre corps avec ${target}. || ${author} partage une nuit douce et pleine de rêves charnels avec ${target}... || Blotti(e) contre ${target}, ${author} s\'endort paisiblement après leurs ébats.'
  },
  {
    name: 'douche',
    description: 'Prendre une douche avec quelqu\'un',
    title: '🚿 Douche Brûlante',
    selfMessage: '${author} prend une douche froide pour calmer ses ardeurs.',
    targetMessage: '${author} rejoint ${target} sous l\'eau chaude de la douche pour un moment très sensuel... || Sous les jets d\'eau, ${author} savonne sensuellement le corps de ${target}... || L\'eau ruisselle sur les corps enlacés de ${author} et ${target} sous la douche.'
  },
  {
    name: 'flirter',
    description: 'Flirter avec quelqu\'un',
    title: '😏 Flirt Suggestif',
    selfMessage: '${author} s\'envoie des clins d\'œil dans le miroir.',
    targetMessage: '${author} chuchote des mots doux et très provocants à l\'oreille de ${target}... || ${author} joue un jeu de séduction et flirte ouvertement avec ${target}... || ${author} taquine ${target} avec des sourires charmeurs et un flirt torride.'
  },
  {
    name: 'fuck',
    description: 'Baiser quelqu\'un',
    title: '🍆 Baiser Sauvage',
    selfMessage: '${author} se fait plaisir en solo...',
    targetMessage: '${author} prend sauvagement ${target} dans une étreinte charnelle et torride ! || ${author} baise et pénètre passionnément ${target} pour une nuit de pure folie... || L\'union charnelle de ${author} et ${target} atteint des sommets de luxure !'
  },
  {
    name: 'laisse',
    description: 'Mettre une laisse à quelqu\'un',
    title: '⛓️ Soumission en Laisse',
    selfMessage: '${author} s\'attache une laisse (un peu étrange...).',
    targetMessage: '${author} passe une laisse en cuir autour du cou de ${target} pour le/la guider à sa guise. || ${author} soumet ${target} en tenant fermement sa laisse... || ${target} se laisse guider docilement par la laisse tenue par ${author}.'
  },
  {
    name: 'lit',
    description: 'Aller au lit avec quelqu\'un',
    title: '🛏️ Partie de Jambes en l\'air',
    selfMessage: '${author} s\'allonge sur le lit en rêvant de compagnie.',
    targetMessage: '${author} entraîne ${target} sous les draps pour une nuit torride et agitée... || Le lit grince sous les mouvements passionnés de ${author} et ${target}... || ${author} et ${target} se rejoignent sur le lit pour un corps-à-corps brûlant.'
  },
  {
    name: 'masser',
    description: 'Masser quelqu\'un',
    title: '💆 Massage Sensuel',
    selfMessage: '${author} se masse les épaules pour décompresser.',
    targetMessage: '${author} masse doucement le corps de ${target} avec une huile parfumée et chaude. || Sous les mains de ${author}, les muscles de ${target} se détendent et le désir monte... || ${author} offre un massage voluptueux à ${target} pour éveiller ses sens.'
  },
  {
    name: 'ordonner',
    description: 'Ordonner à quelqu\'un',
    title: '👑 Ordre de Domination',
    selfMessage: '${author} se donne des ordres à lui-même.',
    targetMessage: '${author} soumet ${target} à son autorité et lui ordonne de lui obéir... || ${author} prend une voix ferme et ordonne à ${target} de satisfaire ses désirs... || ${target} écoute docilement ce que ${author} lui ordonne de faire.'
  },
  {
    name: 'orgie',
    description: 'Organiser une orgie',
    title: '🔞 Orgie Torride',
    selfMessage: '${author} rêve d\'une nuit à plusieurs...',
    targetMessage: '${author} invite ${target} à rejoindre une orgie sensuelle où les corps se mélangent avec passion ! || ${author} et ${target} se laissent emporter dans une orgie sauvage et torride... || Les limites s\'effacent alors que ${author} entraîne ${target} dans une orgie charnelle.'
  },
  {
    name: 'oups',
    description: 'Faire une erreur',
    title: '😈 Oups Coquin',
    selfMessage: '${author} fait une gaffe tout(e) seul(e).',
    targetMessage: '${author} fait mine d\'avoir glissé pour se frotter contre ${target}... Oups ! || Un geste maladroit rapproche accidentellement le corps de ${author} tout contre ${target}... || ${author} frôle intimement ${target} et sourit : « Oups... »'
  },
  {
    name: 'tromper',
    description: 'Tromper quelqu\'un',
    title: '💔 Infidélité Charnelle',
    selfMessage: '${author} se ment à lui-même.',
    targetMessage: '${author} s\'échappe discrètement pour passer un moment secret et torride avec ${target}... || Dans l\'ombre, ${author} cède à la tentation et trompe ses proches avec ${target}... || ${author} partage une relation secrète, interdite et passionnée avec ${target}.'
  }
];

const targetDir = path.join(__dirname, '../commands/actions');

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

actions.forEach(act => {
  const content = `const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { getEconomy, updateEconomy, getActionGifs, db } = require('../../database/db');
const fs = require('fs');
const path = require('path');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('${esc(act.name)}')
    .setDescription("${esc(act.description)}")
    .addUserOption(option => option.setName('cible').setDescription('Personne ciblée (optionnel)').setRequired(false))
    .setDMPermission(true),

  async execute(interaction) {
    await interaction.deferReply();
    const guildId = interaction.guild ? interaction.guild.id : null;
    const userId = interaction.user.id;
    let target = interaction.options.getUser('cible');

    if (!target) {
      if (interaction.guild) {
        const members = await interaction.guild.members.fetch({ limit: 100 }).catch(() => null);
        const randomMember = members ? members.filter(m => m.id !== userId).random() : null;
        target = randomMember ? randomMember.user : interaction.user;
      } else {
        target = interaction.user;
      }
    }

    const author = interaction.user;
    
    // Rangs de récompense par défaut
    const minReward = 5;
    const maxReward = 15;
    const karmaMin = 1;
    const karmaMax = 3;
    
    const karmaReward = Math.floor(Math.random() * (karmaMax - karmaMin + 1)) + karmaMin;
    const reward = Math.floor(Math.random() * (maxReward - minReward + 1)) + minReward;
    
    let totalCoins = 0;
    
    if (guildId) {
      const eco = getEconomy(guildId, userId);
      totalCoins = eco.wallet + eco.bank + reward;
      updateEconomy(guildId, userId, {
        wallet: eco.wallet + reward,
        karma: eco.karma + karmaReward
      });
    } else {
      totalCoins = reward;
    }

    const targetMember = interaction.guild ? await interaction.guild.members.fetch(target.id).catch(() => null) : null;
    let actionMessage = "";

    // Tenter de générer une phrase unique via l'IA en temps réel
    if (target.id !== userId) {
      const { generateAiActionPhrase } = require('../../utils/aiActionHelper');
      const aiPhrase = await generateAiActionPhrase('${esc(act.name)}', '${esc(act.description)}', interaction.member, targetMember);
      if (aiPhrase) {
        actionMessage = aiPhrase;
      }
    }

    // Fallback aux phrases configurées en base de données / par défaut
    if (!actionMessage) {
      actionMessage = target.id === userId 
        ? \`${esc(act.selfMessage)}\`
        : \`${esc(act.targetMessage)}\`;

      if (guildId) {
        const { getCustomActionMessage } = require('../../database/db');
        const customMsg = getCustomActionMessage(guildId, '${esc(act.name)}');
        if (customMsg) {
          actionMessage = target.id === userId
            ? (customMsg.self_message || actionMessage)
            : (customMsg.target_message || actionMessage);
        }
      }

      // Sélectionner une phrase aléatoire si des alternatives séparées par "||" existent
      if (actionMessage.includes('||')) {
        const parts = actionMessage.split('||').map(p => p.trim()).filter(p => p.length > 0);
        if (parts.length > 0) {
          actionMessage = parts[Math.floor(Math.random() * parts.length)];
        }
      }

      const { formatGenderMessage } = require('../../utils/genderHelper');
      actionMessage = formatGenderMessage(actionMessage, interaction.member, targetMember);
    }

    const embed = new EmbedBuilder()
      .setTitle("${esc(act.title)}")
      .setDescription(actionMessage)
      .setColor(0x8B0000)
      .setAuthor({ name: author.username, iconURL: author.displayAvatarURL({ dynamic: true }) })
      .setTimestamp();

    const files = [];
    const targetFiles = [];
    
    let gifs = [];
    if (guildId) {
      gifs = getActionGifs(guildId, '${esc(act.name)}');
    } else {
      try {
        gifs = db.prepare('SELECT * FROM action_gifs WHERE action_name = ?').all('${esc(act.name)}');
      } catch (e) {
        console.error('Erreur lecture gifs en MP:', e);
      }
    }

    if (gifs && gifs.length > 0) {
      const randomGif = gifs[Math.floor(Math.random() * gifs.length)].gif_url;
      if (randomGif.startsWith('/uploads/')) {
        const absPath = path.join(__dirname, '../../../public', randomGif);
        if (fs.existsSync(absPath)) {
          const filename = path.basename(randomGif);
          files.push(new AttachmentBuilder(absPath, { name: filename }));
          targetFiles.push(new AttachmentBuilder(absPath, { name: filename }));
          embed.setImage(\`attachment://\${filename}\`);
        }
      } else if (randomGif.startsWith('http://') || randomGif.startsWith('https://')) {
        embed.setImage(randomGif);
      }
    }

    if (guildId) {
      embed.setDescription(\`\${actionMessage}\\n\\n💰 **+\${reward} pièces**  ·  ✨ **+\${karmaReward} Karma**\`);
      embed.setFooter({ text: \`Solde: \${totalCoins} pièces · +\${karmaReward} karma\` });
    } else {
      embed.setFooter({ text: '💬 Exécuté en message privé (sans gain de pièces ou de karma)' });
    }

    const mention = target && target.id !== userId ? \`<@\${target.id}>\` : null;
    await interaction.editReply({
      content: mention,
      embeds: [embed],
      files: files,
      allowedMentions: mention ? { users: [target.id] } : { parse: [] }
    });

    if (!guildId && target && target.id !== userId) {
      try {
        await target.send({
          content: \`🔔 **<@\${userId}>** vous a fait une action en MP !\`,
          embeds: [embed],
          files: targetFiles
        });
      } catch (err) {
        console.error('Impossible d\\\'envoyer le MP de l\\\'action à la cible :', err);
      }
    }
  }
};
`;

  fs.writeFileSync(path.join(targetDir, `${act.name}.js`), content);
  console.log(`Action ${act.name} créée.`);
});

console.log("Toutes les actions ont été créées !");

function esc(str) {
  if (!str) return "";
  return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/'/g, "\\'");
}
