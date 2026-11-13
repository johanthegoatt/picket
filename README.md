# Picket

Tell it how long a fence you want and it gives you the shopping list: how many
panels and posts to buy, how long the posts need to be, how many bags of
postmix to set them in, and the gravel boards and caps to finish it.

Runs entirely in your browser. Nothing is uploaded, and there is nothing to
sign in to.

## How it works it out

- **Panels** — your run divided by one panel's width, rounded up. The last
  panel usually lands mid-width, so Picket shows what it's cut to and the
  offcut.
- **Posts** — one more than the panels (there's a post at each end as well as
  between every panel), plus any extras you add for corners, gates or a run
  that ends against a wall.
- **Post length** — a post is set about a third of its height into the ground,
  roughly 600 mm for a full fence, so a 1.83 m (6 ft) fence wants a 2.4 m post.
  Picket rounds up to a length you can buy and tells you how deep to dig.
- **Postmix** — the rapid-set bagged concrete you pour in dry and wet down.
  Usually 1–2 bags a post in firm ground and 2–3 in soft, a bit more for a tall
  or heavy-duty post, so it's shown as a range.
- **Gravel boards** — one per bay, to keep the panels off wet ground.
- **Caps** — one per post, to shed rain off the tops.

Panel widths vary by make: a 6 ft panel is 1.83 m but European panels are
1.80 m, and over a long boundary the difference adds up, so set the width to
match the panel you're buying.

## Sources

- [Jacksons Fencing — fence builder](https://www.jacksons-fencing.co.uk/fence-builder) (panels, posts, postmix per post by ground and height)
- [Wern-Wood — how many panels, posts and bags of postmix](https://www.wern-wood.com/blogs/timber/how-many-fence-panels-posts-bags-of-postmix-do-i-need)
- [MyJobQuote — how much postcrete per post](https://www.myjobquote.co.uk/questions/how-much-postcrete-do-i-need-for-each-wooden-post)

Figures are typical. The real postmix amount depends on your hole and post
size, and a tall or exposed boundary may need deeper posts or concrete spurs.
Picket is a shopping-list guide, not a structural design.

## Develop

The maths lives in `src/core.js` with no DOM, so it runs in the page and under
Node's test runner.

```
npm test
```

## Meet Perry

Perry is the fence post in the corner. Tap for a tip; Perry watches for a cut
end panel, soft ground and a tall exposed run.

## Licence

MIT. See [LICENSE](LICENSE).
