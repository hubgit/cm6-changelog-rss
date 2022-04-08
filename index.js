import { Feed } from 'feed'
import shajs from 'sha.js'

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

const url = new URL('https://codemirror.net/6/docs/changelog/')

/**
 * @param {Request} request
 */
async function handleRequest(request) {
  const response = await fetch(url)

  if (!response.ok) {
    return new Response(null, { status: 500 })
  }

  const rewriter = new HTMLRewriter()

  const items = []

  let item = {
    chunks: [],
    text: '',
    url: '',
  }

  rewriter.on('h2', {
    element() {
      if (item.url && item.text) {
        items.push(item)
      }

      item = {
        chunks: [],
        text: '',
        url: '',
      }
    },

    text(text) {
      item.chunks.push(text.text)

      if (text.lastInTextNode) {
        item.text += item.chunks.join('')
        item.chunks = []
      }
    },
  })

  rewriter.on('h2 > a', {
    element(element) {
      item.url = new URL(element.getAttribute('href'), url).toString()
    },
  })

  await rewriter.transform(response).text() // wait for parsing to finish

  if (item.text) {
    items.push(item)
  }

  const feed = new Feed({
    title: 'CodeMirror 6 Changelog',
    description: 'Version history and release notes of the core packages.',
    link: 'https://codemirror.net/6/docs/changelog/',
    language: 'en',
  })

  for (const item of items) {
    const matches = item.text.match(/\((\d{4}-\d{2}-\d{2})\)/)

    feed.addItem({
      title: item.text,
      link: item.url,
      description: item.text,
      date: matches ? new Date(matches[1]) : undefined,
      guid: new shajs.sha256().update(item.text).digest('hex'),
    })
  }

  return new Response(feed.rss2(), {
    status: 200,
    statusText: 'ok',
    headers: {
      'Content-Type': 'application/rss+xml',
    },
  })
}
