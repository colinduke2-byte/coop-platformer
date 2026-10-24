// WQ11: lore pages that repeat. Places of one kind draw on a small family of pages (ruin0-2, stone0-2...). When the page a
// place would show has been read and the family still has an unread one, the place shows that one instead, so a hard find
// is never "E: REREAD" while something new exists. Hidden places (ancient trees, caches) have their own family of ten.
import { S } from '../systems/state.js';
import { LORE } from '../data/lore.js';

Object.assign(LORE, {
  hidden0: { title: 'Carved in the Bark', text: ['WE CAME HERE TO BE FORGOTTEN, AND IT WORKED. IF YOU CAN READ THIS, IT STOPPED WORKING.'] },
  hidden1: { title: 'A Root-Keeper\'s Count', text: ['Rings counted: nine hundred and four. Then I lost count, and the tree laughed. Trees can laugh. It sounds like snow falling off a branch.'] },
  hidden2: { title: 'Under the Stone', text: ['Whoever hid this did it well. Whoever finds it should do something better with it.'] },
  hidden3: { title: 'A Map with No Names', text: ['Every road is drawn, and none of them is named. The note says: names are for people who want to be found.'] },
  hidden4: { title: 'The Quiet Places', text: ['There are places the roads do not go. The kings did not forget them. The kings were told to stay away, and for once they listened.'] },
  hidden5: { title: 'Scratched on a Tin', text: ['Two winters here. The wolves leave me be. I think they think I am one of the trees.'] },
  hidden6: { title: 'An Old Tree\'s Blessing', text: ['Rest your back on the bark and breathe slowly. Old wood remembers warmth, and lends it to those who ask politely.'] },
  hidden7: { title: 'A Smuggler\'s Rule', text: ['Hide it where nobody walks. Then hide the path to it. Then forget the path. Then you will never find it either. That is the cost.'] },
  hidden8: { title: 'The Dreamer\'s Mark', text: ['Somebody drew a sleeping eye here, long ago. The same eye is on the wall of your house in Hollowfrost. Nobody there remembers drawing it.'] },
  hidden9: { title: 'Last Will', text: ['Everything I owned is in the box. It is not much. I hope you are colder than I was and need it more.'] },
});

const familyOf = (id) => id?.match(/^([a-z]+)\d+$/)?.[1];
const pagesOf = (fam) => Object.keys(LORE).filter((k) => familyOf(k) === fam).sort((a, b) => Number(a.slice(fam.length)) - Number(b.slice(fam.length)));

// Swap read pages for unread ones of the same family. books: the map's lore books ({ id }), reassigned in place.
export function freshPages(books) {
  const taken = new Set(books.map((b) => b.id));
  books.forEach((b, i) => {
    const fam = familyOf(b.id);
    if (!fam || !S.lore?.[b.id]) return;
    const unread = pagesOf(fam).filter((k) => !S.lore[k] && !taken.has(k));
    if (!unread.length) return;
    b.id = unread[i % unread.length]; taken.add(b.id);
  });
}
