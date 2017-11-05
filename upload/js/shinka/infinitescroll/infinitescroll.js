XF.ShinkaInfiniteScroll = XF.Element.newHandler({
    options: {
        action: null,
        method: 'get',
        append: '.message--post',
        container: '.block-body:first',

        scrollThreshold: 100,
        scrollContainer: window,
        bottom: '.block-container:first',

        throttleInterval: 200,
        history: 'push',
        nav: 'update',
        navContainer: '.pageNavWrapper',
        status: true,

        page: 1,
        lastPage: null,
        perPage: 20,
        total: null,
        link: null,
        data: null
    },

    $scrollContainer: null,
    $bottom: null,
    $container: null,
    $nav: null,
    bottomPosition: null,
    action: null,
    currentPage: 1,
    requestPending: false,
    lastPage: 20,

    /**
     * On element load, set common properties and attach scroll handler
     */
    init: function()
    {
        if (this.options.nav === 'hide')
            $(this.options.navContainer).hide();

        this.currentPage = parseInt(this.options.page) || 1;
        this.$scrollContainer = $(this.options.scrollContainer);
        this.$bottom = $(this.options.bottom);
        this.$container = $(this.options.container);
        this.$nav = $(this.options.navContainer);
        this.bottomPosition = this.calculateBottomPosition();
        this.action = this.options.action;
        this.lastPage = this.options.lastPage || Math.ceil(this.options.total / this.options.perPage) || 20;

        // history.scrollRestoration = 'manual';

        history.replaceState({container: this.$container.html(), nav: this.$nav.html(), page: this.currentPage},
            document.title,
            window.location.href);

        // Handle scroll event only once in the given interval
        this.$scrollContainer.scroll(this.debounce(
            $.proxy(this, 'infiniteScrollHandler'),
            this.options.throttleInterval
        ));

        $(window).on('popstate', $.proxy(this, 'back'));
    },

    /**
     * If scroll position is within the threshold, request the next page.
     *
     * @param event
     */
    infiniteScrollHandler: function(event)
    {
        if (this.currentPage === this.lastPage || this.requestPending)
        {
            return;
        }

        console.log('scrolling');
        if (this.withinThreshold())
        {
            this.getNextPage();
        }
    },

    /**
     * Makes AJAX request for next page
     */
    getNextPage: function()
    {

        let self = this;
        self.requestPending = true;

        this.action = self.buildUrl(this.currentPage+1);
        let event = $.Event('infinite-scroll:before'),
            config = {
                handler: this,
                method: self.options.method,
                action: self.action,
                successCallback: $.proxy(this, 'processResponse'),
                ajaxOptions: {skipDefault: true}
            };

        // do this in a timeout to ensure that all other handlers run
        setTimeout(function()
        {
            XF.ajax(
                config.method,
                config.action,
                {},
                config.successCallback,
                config.ajaxOptions
            ).always(function()
            {
                // delay re-enable slightly to allow animation to potentially happen
                setTimeout(function()
                {
                    self.requestPending = false;
                }, 300);
                event = $.Event('infinite-scroll:always');
            });
        }, 0);
    },

    /**
     *
     * @param data
     * @param status
     * @param xhr
     */
    processResponse: function(data, status, xhr)
    {
        if (typeof data !== 'object')
        {
            XF.alert('Response was not JSON.');
            return;
        }

        this.currentPage++;
        const $target = this.$target;
        const self = this;

        let event = $.Event('infinite-scroll:response');
        $target.trigger(event, data, this);

        let errorEvent = $.Event('infinite-scroll:error'),
            hasError = false;

        if (data.errorHtml)
        {
            $target.trigger(errorEvent, data, this);
            if (!errorEvent.isDefaultPrevented())
            {
                XF.setupHtmlInsert(data.errorHtml, function($html, container)
                {
                    const title = container.h1 || container.title || XF.phrase('oops_we_ran_into_some_problems');
                    XF.overlayMessage(title, $html);
                });
            }

            hasError = true;
        }
        else if (data.errors)
        {
            $target.trigger(errorEvent, data, this);
            if (!errorEvent.isDefaultPrevented())
            {
                XF.alert(data.errors);
            }

            hasError = true;
        }
        else if (data.exception)
        {
            XF.alert(data.exception);
        }
        else if (data.html)
        {
            XF.setupHtmlInsert(data.html, function($html, container, onComplete)
            {
                if (self.appendPage($html, onComplete))
                {
                    self.updateNav($html);
                    self.updateUrl(container);
                    return false;
                }

                // I have literally no idea why this is necessary, but XF throws an exception without it
                const $childOverlay = XF.getOverlayHtml({
                    html: $html,
                    title: container.h1 || container.title
                });
                XF.showOverlay($childOverlay);
            });
        }

        event = $.Event('infinite-scroll:complete');
        $target.trigger(event, data, this);
    },

    /**
     * Adds new page to end of the container
     *
     * @param $html
     * @param container
     */
    appendPage: function($html, container)
    {
        if (!this.$container.length) return false;

        $append = $html.find(this.options.append);
        $append.hide();
        this.$container.append($append);
        $append.xfFadeDown(null, XF.layoutChange);
        XF.activate($append);

        this.bottomPosition = this.calculateBottomPosition();

        return true;
    },

    /**
     * Replaces pager with the one in the response HTML
     *
     * @param $html HTML returned by the HTTP response
     */
    updateNav: function($html)
    {
        $new = $html.find(this.options.navContainer);

        if ($new.length !== this.$nav.length) return;

        $.each($new, (ndx, $n) => this.$nav[ndx].replaceWith($n));
        this.$nav = $(this.options.navContainer);
    },

    /**
     * Updates current URL or pushes to history
     *
     * @param container
     */
    updateUrl: function(container)
    {
        if (this.options.history)
        {
            history.pushState({container: this.$container.html(), nav: this.$nav.html(), page: this.currentPage},
                              document.title,
                              this.buildUrl(this.currentPage));
        }

        document.title = container.title + XF.phrase('title_page_x', {'{page}': this.currentPage}) + ' | Xenforo';
    },

    buildTitle: function(container, page)
    {
        return (page > 1 ?
                    container.title + XF.phrase('title_page_x', {'{page}': page}) + ' | Xenforo' :
                    container.title + ' | Xenforo');
    },

    back: function(event)
    {
        let state = event.originalEvent.state;
        if (state === null) return;

        let $toKeep = $(state.container).filter(':hidden');
        let $children = this.$container.children();
        let $toRemove = $children.slice($toKeep.length);
        $toRemove.xfFadeUp(null, XF.layoutChange);
        $toRemove.remove();

        this.$nav.html(state.nav);
        this.$nav = $(this.options.navContainer);
        this.currentPage = state.page;

        // history.scrollRestoration isn't supported on IE/Edge
        // because of course it isn't
        // so set scroll fix on a slight delay so it fires after scrollRestoration
        setTimeout(
            () => this.$scrollContainer.scrollTop($children[$toKeep.length-this.options.perPage].offsetTop),
            100
        );
    },

    /**
     * Only call function once within an interval
     *
     * @param func
     * @param interval
     * @returns {Function}
     */
    debounce: function(func, interval)
    {
        let lastCall = -1;
        return function()
        {
            clearTimeout(lastCall);
            const args = arguments;
            const self = this;
            lastCall = setTimeout(function()
            {
                func.apply(self, args);
            }, interval);
        };
    },

    /**
     * Calculates the position of given element's bottom
     */
    calculateBottomPosition: function()
    {
        return this.$bottom.offset().top + this.$bottom.outerHeight() - this.$scrollContainer.innerHeight();
    },

    /**
     * Determine whether current scroll position is within the given threshold of the bottom position
     *
     * @returns {boolean}
     */
    withinThreshold: function()
    {
        let scrollPosition = this.$scrollContainer.scrollTop();
        return scrollPosition >= this.bottomPosition - this.options.scrollThreshold;
    },

    buildUrl: function(page)
    {
        return this.options.action + 'page-' + (page);
    }
});

XF.Element.register('infinite-scroll', 'XF.ShinkaInfiniteScroll');