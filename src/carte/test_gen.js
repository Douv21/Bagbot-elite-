const gen = require('./holographique');
const mockMember = {
  displayName: '𝔅𝔞𝔤 𝓥2 Éléonore ★ 🔥',
  user: {
    username: 'eleonore',
    discriminator: '0',
    displayAvatarURL: () => 'https://cdn.discordapp.com/embed/avatars/0.png'
  }
};
const mockData = {
  level: 5, xp: 250, required: 500, messages: 42, voiceMinutes: 120, streak: 3, karma: 100, roleName: 'VIP'
};

gen(mockMember, mockData, 'holographique').then(a => {
  console.log('TEST RESULT: SUCCESS! Attachment size:', a.attachment.length);
}).catch(e => {
  console.error('TEST RESULT: ERROR:', e);
});
