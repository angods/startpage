/* ==========================================================================
   Startpage · Catálogo de fuentes de noticias (RSS / Atom), por tema
   [nombre, dirección del feed]. "Google News" junta titulares de cientos
   de medios sobre ese tema.
   ========================================================================== */
(function (SP) {
  'use strict';
  const gnews = (topic) => `https://news.google.com/rss/headlines/section/topic/${topic}?hl=en-US&gl=US&ceid=US:en`;

  SP.RSS_SOURCES = [
    {
      id: 'world', label: '🌍 World', sources: [
        ['Google News · World', gnews('WORLD')],
        ['BBC News · World', 'https://feeds.bbci.co.uk/news/world/rss.xml'],
        ['BBC News · Top stories', 'https://feeds.bbci.co.uk/news/rss.xml'],
        ['The Guardian · World', 'https://www.theguardian.com/world/rss'],
        ['The New York Times · World', 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml'],
        ['The New York Times · Home', 'https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml'],
        ['Washington Post · World', 'https://feeds.washingtonpost.com/rss/world'],
        ['Al Jazeera', 'https://www.aljazeera.com/xml/rss/all.xml'],
        ['NPR News', 'https://feeds.npr.org/1001/rss.xml'],
        ['DW · English', 'https://rss.dw.com/rdf/rss-en-all'],
        ['France 24 · English', 'https://www.france24.com/en/rss'],
        ['Sky News · World', 'https://feeds.skynews.com/feeds/rss/world.xml'],
        ['CBC · World', 'https://www.cbc.ca/webfeed/rss/rss-world'],
        ['ABC News Australia', 'https://www.abc.net.au/news/feed/51120/rss.xml'],
        ['The Independent · World', 'https://www.independent.co.uk/news/world/rss'],
      ],
    },
    {
      id: 'business', label: '💼 Business', sources: [
        ['Google News · Business', gnews('BUSINESS')],
        ['BBC · Business', 'https://feeds.bbci.co.uk/news/business/rss.xml'],
        ['The Guardian · Business', 'https://www.theguardian.com/business/rss'],
        ['NYT · Business', 'https://rss.nytimes.com/services/xml/rss/nyt/Business.xml'],
        ['WSJ · World News', 'https://feeds.a.dj.com/rss/RSSWorldNews.xml'],
        ['WSJ · Markets', 'https://feeds.a.dj.com/rss/RSSMarketsMain.xml'],
        ['CNBC · Top News', 'https://www.cnbc.com/id/100003114/device/rss/rss.html'],
        ['MarketWatch · Top Stories', 'https://feeds.content.dowjones.io/public/rss/mw_topstories'],
        ['The Economist · Finance', 'https://www.economist.com/finance-and-economics/rss.xml'],
        ['Yahoo Finance', 'https://finance.yahoo.com/news/rssindex'],
      ],
    },
    {
      id: 'tech', label: '💻 Tech', sources: [
        ['Google News · Technology', gnews('TECHNOLOGY')],
        ['The Verge', 'https://www.theverge.com/rss/index.xml'],
        ['Ars Technica', 'https://feeds.arstechnica.com/arstechnica/index'],
        ['TechCrunch', 'https://techcrunch.com/feed/'],
        ['Wired', 'https://www.wired.com/feed/rss'],
        ['Engadget', 'https://www.engadget.com/rss.xml'],
        ['MIT Technology Review', 'https://www.technologyreview.com/feed/'],
        ['BBC · Technology', 'https://feeds.bbci.co.uk/news/technology/rss.xml'],
        ['The Register', 'https://www.theregister.com/headlines.atom'],
        ['Hacker News', 'https://hnrss.org/frontpage'],
        ['9to5Mac', 'https://9to5mac.com/feed/'],
        ['Android Authority', 'https://www.androidauthority.com/feed/'],
      ],
    },
    {
      id: 'dev', label: '🤖 AI & Dev', sources: [
        ['Hugging Face Blog', 'https://huggingface.co/blog/feed.xml'],
        ['Google AI Blog', 'https://blog.google/technology/ai/rss/'],
        ['OpenAI News', 'https://openai.com/news/rss.xml'],
        ['Simon Willison', 'https://simonwillison.net/atom/everything/'],
        ['GitHub Blog', 'https://github.blog/feed/'],
        ['Hacker News · Best', 'https://hnrss.org/best'],
        ['Lobsters', 'https://lobste.rs/rss'],
        ['DEV Community', 'https://dev.to/feed'],
        ['Smashing Magazine', 'https://www.smashingmagazine.com/feed/'],
      ],
    },
    {
      id: 'science', label: '🔬 Science', sources: [
        ['Google News · Science', gnews('SCIENCE')],
        ['NASA · News', 'https://www.nasa.gov/news-release/feed/'],
        ['ScienceDaily', 'https://www.sciencedaily.com/rss/top/science.xml'],
        ['New Scientist', 'https://www.newscientist.com/feed/home/'],
        ['Nature', 'https://www.nature.com/nature.rss'],
        ['Quanta Magazine', 'https://www.quantamagazine.org/feed/'],
        ['Scientific American', 'https://www.scientificamerican.com/platform/syndication/rss/'],
        ['Space.com', 'https://www.space.com/feeds/all'],
        ['Phys.org', 'https://phys.org/rss-feed/'],
        ['BBC · Science & Environment', 'https://feeds.bbci.co.uk/news/science_and_environment/rss.xml'],
      ],
    },
    {
      id: 'health', label: '🩺 Health', sources: [
        ['Google News · Health', gnews('HEALTH')],
        ['BBC · Health', 'https://feeds.bbci.co.uk/news/health/rss.xml'],
        ['NYT · Health', 'https://rss.nytimes.com/services/xml/rss/nyt/Health.xml'],
        ['WHO · News', 'https://www.who.int/rss-feeds/news-english.xml'],
        ['STAT News', 'https://www.statnews.com/feed/'],
      ],
    },
    {
      id: 'climate', label: '🌱 Climate', sources: [
        ['The Guardian · Environment', 'https://www.theguardian.com/environment/rss'],
        ['Inside Climate News', 'https://insideclimatenews.org/feed/'],
        ['Carbon Brief', 'https://www.carbonbrief.org/feed/'],
        ['NYT · Climate', 'https://rss.nytimes.com/services/xml/rss/nyt/Climate.xml'],
      ],
    },
    {
      id: 'sports', label: '⚽ Sports', sources: [
        ['Google News · Sports', gnews('SPORTS')],
        ['BBC Sport', 'https://feeds.bbci.co.uk/sport/rss.xml'],
        ['BBC Sport · Football', 'https://feeds.bbci.co.uk/sport/football/rss.xml'],
        ['ESPN', 'https://www.espn.com/espn/rss/news'],
        ['ESPN · Soccer', 'https://www.espn.com/espn/rss/soccer/news'],
        ['The Guardian · Football', 'https://www.theguardian.com/football/rss'],
        ['Sky Sports', 'https://www.skysports.com/rss/12040'],
        ['Autosport · F1', 'https://www.autosport.com/rss/f1/news/'],
      ],
    },
    {
      id: 'culture', label: '🎬 Culture & Games', sources: [
        ['Google News · Entertainment', gnews('ENTERTAINMENT')],
        ['The Guardian · Culture', 'https://www.theguardian.com/culture/rss'],
        ['NYT · Arts', 'https://rss.nytimes.com/services/xml/rss/nyt/Arts.xml'],
        ['Variety', 'https://variety.com/feed/'],
        ['Rolling Stone', 'https://www.rollingstone.com/feed/'],
        ['Pitchfork', 'https://pitchfork.com/rss/news/'],
        ['IGN', 'https://feeds.ign.com/ign/all'],
        ['Polygon', 'https://www.polygon.com/rss/index.xml'],
      ],
    },
    {
      id: 'longreads', label: '📖 Long reads', sources: [
        ['The Atlantic', 'https://www.theatlantic.com/feed/all/'],
        ['The New Yorker', 'https://www.newyorker.com/feed/everything'],
        ['Aeon', 'https://aeon.co/feed.rss'],
        ['The Guardian · The Long Read', 'https://www.theguardian.com/news/series/the-long-read/rss'],
      ],
    },
    {
      id: 'es', label: '🇪🇸 En español', sources: [
        ['BBC Mundo', 'https://feeds.bbci.co.uk/mundo/rss.xml'],
        ['El País', 'https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/portada'],
        ['DW Español', 'https://rss.dw.com/xml/rss-sp-all'],
        ['CNN en Español', 'https://cnnespanol.cnn.com/feed/'],
        ['Infobae', 'https://www.infobae.com/feeds/rss/'],
        ['La Nación (AR)', 'https://www.lanacion.com.ar/arc/outboundfeeds/rss/?outputType=xml'],
        ['Clarín', 'https://www.clarin.com/rss/lo-ultimo/'],
        ['Xataka', 'https://www.xataka.com/feedburner.xml'],
        ['Genbeta', 'https://www.genbeta.com/feedburner.xml'],
      ],
    },
  ];
})(window.SP);
