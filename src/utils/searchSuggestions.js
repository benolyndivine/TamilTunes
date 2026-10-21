/**
 * Comprehensive Tamil Music Search Suggestions Database & Helper
 * Provides instant suggestions for tracks, artists, and movies as the user types
 */

// Popular Tamil Artists & Music Directors
export const TAMIL_ARTISTS = [
  'Anirudh Ravichander',
  'A.R. Rahman',
  'Yuvan Shankar Raja',
  'Harris Jayaraj',
  'Ilaiyaraaja',
  'Santhosh Narayanan',
  'G.V. Prakash Kumar',
  'D. Imman',
  'Sid Sriram',
  'Vidyasagar',
  'Deva',
  'S.P. Balasubrahmanyam',
  'K.J. Yesudas',
  'Hariharan',
  'Unni Menon',
  'Vijay Antony',
  'Hiphop Tamizha',
  'Sam C.S.',
  'Sean Roldan',
  'Ghibran',
  'Pradeep Kumar',
  'Haricharan',
  'Jonita Gandhi',
  'Shreya Ghoshal',
  'Andrea Jeremiah',
  'Chinmayi Sripaada',
  'Dhee',
  'Sai Abhyankkar',
  'Shashaa Tirupati',
  'Sathyaprakash',
  'Karthik',
  'Naresh Iyer',
  'Thalapathy Vijay',
  'Dhanush',
  'Silambarasan TR'
];

// Popular Tamil Movies & Soundtracks
export const TAMIL_MOVIES = [
  'Beast',
  'Jailer',
  'Leo',
  'Master',
  'Vikram',
  'The Greatest of All Time (GOAT)',
  'Vettaiyan',
  'Amaran',
  'Kanguva',
  'Raayan',
  'Indian 2',
  'Captain Miller',
  'Ayalaan',
  'Ponniyin Selvan (PS-1 & PS-2)',
  'Varisu',
  'Thunivu',
  'Kaithi',
  'Petta',
  'Darbar',
  'Bigil',
  'Mersal',
  'Sarkar',
  'Theri',
  'Kaththi',
  'Thuppakki',
  'Mankatha',
  'Billa',
  'Ayan',
  'Vaaranam Aayiram',
  'Ghajini',
  'Minnale',
  'Vinnaithaandi Varuvaayaa',
  'Pudhupettai',
  '7G Rainbow Colony',
  'Kadhal Kondein',
  'Roja',
  'Bombay',
  'Alaipayuthey',
  'Mudalvan',
  'Jeans',
  'Kannathil Muthamittal',
  'Enthiran',
  'Sivaji',
  'Anniyan',
  'Padayappa',
  'Baashha',
  'Muthu',
  'Kabali'
];

// Curated Tamil Hit Songs
export const TAMIL_HITS = [
  { title: 'Arabic Kuthu - Halamithi Habibo', artist: 'Anirudh Ravichander, Jonita Gandhi', movie: 'Beast' },
  { title: 'Hukum - Thalaivar Alappara', artist: 'Anirudh Ravichander', movie: 'Jailer' },
  { title: 'Kaavaalaa', artist: 'Anirudh Ravichander, Shilpa Rao', movie: 'Jailer' },
  { title: 'Badass', artist: 'Anirudh Ravichander', movie: 'Leo' },
  { title: 'Naa Ready', artist: 'Thalapathy Vijay, Anirudh Ravichander', movie: 'Leo' },
  { title: 'Ordinary Person', artist: 'Anirudh Ravichander, Nikhita Gandhi', movie: 'Leo' },
  { title: 'Vaathi Coming', artist: 'Anirudh Ravichander, Gana Balachandar', movie: 'Master' },
  { title: 'Kutti Story', artist: 'Thalapathy Vijay, Anirudh Ravichander', movie: 'Master' },
  { title: 'Master the Blaster', artist: 'Bjorn Surrao, Anirudh Ravichander', movie: 'Master' },
  { title: 'Rowdy Baby', artist: 'Dhanush, Dhee', movie: 'Maari 2' },
  { title: 'Why This Kolaveri Di', artist: 'Dhanush, Anirudh Ravichander', movie: '3' },
  { title: 'Aasa Kooda', artist: 'Sai Abhyankkar, Sai Smriti', movie: 'Think Indie' },
  { title: 'Katchi Sera', artist: 'Sai Abhyankkar', movie: 'Think Indie' },
  { title: 'Chaleya (Tamil)', artist: 'Anirudh Ravichander, Shilpa Rao', movie: 'Jawan' },
  { title: 'Hayyoda', artist: 'Anirudh Ravichander, Priya Mali', movie: 'Jawan' },
  { title: 'Matta', artist: 'Yuvan Shankar Raja, Shenbagaraj', movie: 'The GOAT' },
  { title: 'Whistle Podu', artist: 'Thalapathy Vijay, Yuvan Shankar Raja', movie: 'The GOAT' },
  { title: 'Spark', artist: 'Yuvan Shankar Raja, Vrusha Balu', movie: 'The GOAT' },
  { title: 'Manasilaayo', artist: 'Anirudh Ravichander, Malaysia Vasudevan', movie: 'Vettaiyan' },
  { title: 'Hunter Vantaar', artist: 'Siddharth Basrur, Anirudh Ravichander', movie: 'Vettaiyan' },
  { title: 'Fear Song', artist: 'Anirudh Ravichander', movie: 'Devara' },
  { title: 'Hey Minnale', artist: 'G.V. Prakash Kumar, Haricharan, Shweta Mohan', movie: 'Amaran' },
  { title: 'Water Packet', artist: 'A.R. Rahman, Santhosh Narayanan', movie: 'Raayan' },
  { title: 'Usure Neethaney', artist: 'A.R. Rahman', movie: 'Raayan' },
  { title: 'Aga Naga', artist: 'A.R. Rahman, Shakthisree Gopalan', movie: 'Ponniyin Selvan 2' },
  { title: 'Chinnanjiru Nilave', artist: 'A.R. Rahman, Haricharan', movie: 'Ponniyin Selvan 2' },
  { title: 'Ponni Nadhi', artist: 'A.R. Rahman, AR Raihanah, Bamba Bakya', movie: 'Ponniyin Selvan 1' },
  { title: 'Alaikadal', artist: 'A.R. Rahman, Antara Nandy', movie: 'Ponniyin Selvan 1' },
  { title: 'Ranjithame', artist: 'Thalapathy Vijay, Manasi MM', movie: 'Varisu' },
  { title: 'Thee Thalapathy', artist: 'Silambarasan TR', movie: 'Varisu' },
  { title: 'Jimikki Ponnu', artist: 'Anirudh Ravichander, Jonita Gandhi', movie: 'Varisu' },
  { title: 'Soul of Varisu', artist: 'K.S. Chithra', movie: 'Varisu' },
  { title: 'Porkanda Singam', artist: 'Anirudh Ravichander, Ravi G', movie: 'Vikram' },
  { title: 'Vikram Title Track', artist: 'Anirudh Ravichander', movie: 'Vikram' },
  { title: 'Wasted', artist: 'Anirudh Ravichander', movie: 'Vikram' },
  { title: 'Pathala Pathala', artist: 'Kamal Haasan, Anirudh Ravichander', movie: 'Vikram' },
  { title: 'Dippam Dippam', artist: 'Anirudh Ravichander, Anthony Daasan', movie: 'Kaathuvaakula Rendu Kaadhal' },
  { title: 'Two Two Two', artist: 'Anirudh Ravichander, Sunidhi Chauhan', movie: 'Kaathuvaakula Rendu Kaadhal' },
  { title: 'Naan Pizhai', artist: 'Ravi G, Shashaa Tirupati', movie: 'Kaathuvaakula Rendu Kaadhal' },
  { title: 'Megham Karukatha', artist: 'Dhanush', movie: 'Thiruchitrambalam' },
  { title: 'Thaensudare', artist: 'Dhanush, Dhee', movie: 'Thiruchitrambalam' },
  { title: 'Bodhai Kodhai', artist: 'Anirudh Ravichander, Santhosh Narayanan', movie: 'Ondraga Originals' },
  { title: 'Munbe Vaa', artist: 'A.R. Rahman, Naresh Iyer, Shreya Ghoshal', movie: 'Sillunu Oru Kaadhal' },
  { title: 'New York Nagaram', artist: 'A.R. Rahman', movie: 'Sillunu Oru Kaadhal' },
  { title: 'Vaseegara', artist: 'Harris Jayaraj, Bombay Jayashri', movie: 'Minnale' },
  { title: 'Venmathi Venmathiye', artist: 'Harris Jayaraj, Tippu, Roop Kumar Rathod', movie: 'Minnale' },
  { title: 'Nenjukkul Peidhidum', artist: 'Harris Jayaraj, Hariharan, Devan Ekambaram', movie: 'Vaaranam Aayiram' },
  { title: 'Adiye', artist: 'A.R. Rahman, Sid Sriram', movie: 'Kadal' },
  { title: 'Kandangi Kandangi', artist: 'D. Imman, Vijay, Shreya Ghoshal', movie: 'Jilla' },
  { title: 'Kurumugil', artist: 'G.V. Prakash Kumar, Sai Vignesh', movie: 'Sita Ramam' },
  { title: 'Kannazhaga', artist: 'Dhanush, Shruti Haasan', movie: '3' },
  { title: 'Marana Mass', artist: 'Anirudh Ravichander, S.P. Balasubrahmanyam', movie: 'Petta' },
  { title: 'Chumma Kizhi', artist: 'S.P. Balasubrahmanyam, Anirudh Ravichander', movie: 'Darbar' },
  { title: 'Verithanam', artist: 'Thalapathy Vijay', movie: 'Bigil' },
  { title: 'Singappenney', artist: 'A.R. Rahman, Shashaa Tirupati', movie: 'Bigil' },
  { title: 'Bigil Bigil Bigiluma', artist: 'A.R. Rahman', movie: 'Bigil' },
  { title: 'Aalaporaan Thamizhan', artist: 'A.R. Rahman, Kailash Kher, Sathya Prakash', movie: 'Mersal' },
  { title: 'Mersal Arasan', artist: 'A.R. Rahman, G.V. Prakash Kumar', movie: 'Mersal' },
  { title: 'Neethanae', artist: 'A.R. Rahman, Shreya Ghoshal', movie: 'Mersal' },
  { title: 'Kandha Sashti Kavasam', artist: 'Sooryagayathri', movie: 'Devotional' },
  { title: 'Pesamale', artist: 'G.V. Prakash Kumar', movie: 'Pesamale' }
];

/**
 * Returns instant synchronous suggestions based on the user's typed keyword
 *
 * @param {string} keyword User search term
 * @param {number} maxResults Maximum number of suggestions to return
 * @returns {{ queries: string[], artists: string[], movies: string[], songs: { title: string, artist: string, movie: string }[] }}
 */
export function getKeywordSuggestions(keyword = '', maxResults = 8) {
  const clean = keyword.trim().toLowerCase();
  if (!clean || clean.length < 1) {
    return { queries: [], artists: [], movies: [], songs: [] };
  }

  // 1. Match Songs
  const matchedSongs = TAMIL_HITS.filter(
    (s) =>
      s.title.toLowerCase().includes(clean) ||
      s.artist.toLowerCase().includes(clean) ||
      s.movie.toLowerCase().includes(clean)
  ).slice(0, 4);

  // 2. Match Artists
  const matchedArtists = TAMIL_ARTISTS.filter(
    (a) => a.toLowerCase().includes(clean)
  ).slice(0, 3);

  // 3. Match Movies / Albums
  const matchedMovies = TAMIL_MOVIES.filter(
    (m) => m.toLowerCase().includes(clean)
  ).slice(0, 3);

  // 4. Generate direct query completions
  const queries = [];
  matchedSongs.forEach((s) => {
    if (!queries.includes(s.title)) queries.push(s.title);
  });
  matchedArtists.forEach((a) => {
    const q = `${a} Tamil Hits`;
    if (!queries.includes(q)) queries.push(q);
  });
  matchedMovies.forEach((m) => {
    const q = `${m} Songs`;
    if (!queries.includes(q)) queries.push(q);
  });

  return {
    queries: queries.slice(0, maxResults),
    artists: matchedArtists,
    movies: matchedMovies,
    songs: matchedSongs
  };
}
