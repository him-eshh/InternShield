import { planTiles, mergeTiles, findSeam } from './tiles.mjs';
console.log('780x5516', JSON.stringify(planTiles(780, 5516)));
console.log('780x5516 maxTiles2', JSON.stringify(planTiles(780, 5516, { maxTiles: 2 })));
console.log('1170x2532 (iPhone)', JSON.stringify(planTiles(1170, 2532)));
console.log('1170x12000', JSON.stringify(planTiles(1170, 12000)));
const a = ['Recruiter: Hi! We loved your profile', 'Me: Thanks, what is the role?', 'Recruiter: Remote data entry, $45/hr', 'Recruiter: We will send a che'];
const b = ['Recruiter: We will send a check for equipment', 'Me: Do I buy it myself?', 'Recruiter: Yes, from our vendor'];
console.log(mergeTiles([a, b]));
const legitRepeat = [['ok', 'Me: ok'], ['Recruiter: ok', 'Me: ok']];   // short repeats in different speakers must survive
console.log(mergeTiles(legitRepeat));
const rv = Array(400).fill(30); for (let y = 210; y < 240; y++) rv[y] = 1;
console.log('seam', findSeam(rv, 200));
