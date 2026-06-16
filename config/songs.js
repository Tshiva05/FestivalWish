/**
 * config/songs.js
 * Default background music options.
 * URLs point to royalty-free / CC0 audio on Pixabay CDN.
 * Replace with your own Cloudinary-hosted MP3s for production.
 */
const DEFAULT_SONGS = [
  {
    key:      'festival_energy',
    title:    'Festival Energy',
    artist:   'Celebration Vibes',
    cover:    'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&q=80',
    url:      'https://cdn.pixabay.com/audio/2023/07/23/audio_9be35ca8e9.mp3',
    color:    '#FF6B35',
  },
  {
    key:      'sparkle_night',
    title:    'Sparkle Night',
    artist:   'Ambient Dreams',
    cover:    'https://images.unsplash.com/photo-1467810563316-b5476525c0f9?w=300&q=80',
    url:      'https://cdn.pixabay.com/audio/2022/10/18/audio_63efb37e3a.mp3',
    color:    '#7B2FF7',
  },
  {
    key:      'happy_beats',
    title:    'Happy Beats',
    artist:   'Festive Tunes',
    cover:    'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=300&q=80',
    url:      'https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf07a.mp3',
    color:    '#E91E8C',
  },
  {
    key:      'jingle_bells_mix',
    title:    'Jingle Glow',
    artist:   'Winter Magic',
    cover:    'https://images.unsplash.com/photo-1512389142860-9c449e58a543?w=300&q=80',
    url:      'https://cdn.pixabay.com/audio/2021/11/13/audio_cb31e8ac91.mp3',
    color:    '#00BFA5',
  },
  {
    key:      'birthday_party',
    title:    'Birthday Spark',
    artist:   'Party Vibes',
    cover:    'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=300&q=80',
    url:      'https://cdn.pixabay.com/audio/2022/03/15/audio_942be0e6c0.mp3',
    color:    '#FFD600',
  },
];

module.exports = DEFAULT_SONGS;
