Page Graph
==========

Chrome extension to generate interactive page dependency graphs.

![Demo](http://i.imgur.com/XlG8Tql.png)

The above shows the graph obtained from the [IMDb][1] home page. Live
demo [here][2].

[1]: http://www.imdb.com/
[2]: https://cdn.rawgit.com/cyrus-and/a1b3d6a676b3b315cec9f6f87bb972d4/raw/10ccad02e55096ab9238fa846f9a6f0517be015e/demo.html

Description
------------

This PoC exploits the [`initiator`] field of the [Network.requestWillBeSent] of
the [Chrome Debugging Protocol] to build a *dependency graph* of the objects
loaded by a tab during a certain time interval.

Each node represents an HTTP object and it is thus identified by its URL. The
color of the nodes denotes the object type: image, style sheet, etc.

Arrows can be interpreted as *has been loaded by* relationship, and multiple
arrows means that all the targets are responsible of the loading of the source
node (i.e., each element of the AJAX stack trace).

When the same URL is requested more than once a placeholder (empty) node is
added and all the instances are linked back to it by dashed lines. In this case,
only the placeholder node can be the target of a relationship.

[`initiator`]: https://chromedevtools.github.io/debugger-protocol-viewer/tot/Network/#event-requestWillBeSent
[Network.requestWillBeSent]: https://chromedevtools.github.io/debugger-protocol-viewer/tot/Network/#event-requestWillBeSent
[Chrome Debugging Protocol]: https://developer.chrome.com/devtools/docs/debugger-protocol

Setup
-----

1. Install the dependencies locally:

        cd bundle
        npm install
        npm run bundle

2. Navigate to `chrome://extensions`, make sure that "Developer mode" is
   enabled, click "Load unpacked extension..." and select the `extension`
   folder,

Usage
-----

Click on the extension button and follow the instructions.

Graphs can be saved as standalone HTML files.
