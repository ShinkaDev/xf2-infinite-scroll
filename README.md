# [Shinka] Infinite Scroll
Loads content seamlessly as the user scrolls to the bottom of the page.

## Installation
* Download the [latest stable release](https://github.com/kalynrobinson/xf2_infinite_scroll/releases)
* Extract the zip
* Copy the contents of the `upload` folder to the root of your Xenforo installation
* Install and activate the add-on in your Admin CP
 
## Features
* Scrolling to the bottom of a content container (e.g. discussions, member lists, search results) loads content via AJAX request.
* Adjustable settings, e.g.
    * At what scroll position should new content be loaded, e.g. 100 pixels away from the bottom
    * What element's bottom should be used to load new content, e.g. the entire window or the bottom of a discussion
    * Whether the new URL should be pushed to the history or used to replace the current

![Scroll](https://github.com/kalynrobinson/xf2_infinite_scroll/raw/master/docs/images/infinitescroll.gif "Scroll")

## Tip Jar
* Like my plugins and have some extra coffee money? [Throw it my way!](https://www.paypal.me/shinkacodes/5)
 
## Development
### Setup
* Clone or fork the repository
* Create a symbolic link for the AjaxPaging folder in your XF2 installation to the one in the repository directory, e.g.
```
> mklink /D "C:/Fake User/My Site/src/addons/Shinka/InfiniteScroll" "C:/Fake User/Dev/xf2_ajax_paging/upload/src/addons/Shinka/InfiniteScroll"
```
 Import development output by executing 
```
> php cmd.php xf-dev:import --addon Shinka/InfiniteScroll
```
### Build for Release
* Bump up the version using [Xenforo's recommended version ID format](https://xf2demo.xenforo.com/dev-docs/add-on-structure/#recommended-version-id-format) and then build
```
> php cmd.php xf-addon:bump-version Shinka/InfiniteScroll --version-id [version_id] --version-string [version_string]
> php cmd.php xf-addon:build-release Shinka/InfiniteScroll
```
### Technical
* Uses a custom XF handler that pigeons code and logic from XFAjaxSubmit
* My JavaScript is terrible, don't emulate me
