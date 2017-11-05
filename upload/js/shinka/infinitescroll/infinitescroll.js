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
        hideNav: true,
        nav: '.pageNavWrapper',
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
        if (this.options.hideNav)
            $(this.options.nav).hide();

        this.currentPage = parseInt(this.options.page) || 1;
        this.$scrollContainer = $(this.options.scrollContainer);
        this.$bottom = $(this.options.bottom);
        this.$container = $(this.options.container);
        this.bottomPosition = this.calculateBottomPosition();
        this.action = this.options.action;
        this.lastPage = this.options.lastPage || Math.ceil(this.options.total / this.options.perPage) || 20;

        console.log('init');
        console.log('page: ' + this.options.page);

        // Handle scroll event only once in the given interval
        this.$scrollContainer.on('scroll', this.debounce(
            $.proxy(this, 'infiniteScrollHandler'),
            this.options.throttleInterval
        ));
    },

    /**
     * If scroll position is within the threshold, request the next page.
     *
     * @param event
     */
    infiniteScrollHandler: function(event)
    {
        // Remove scroll listener if on the last page
        if (this.currentPage === this.lastPage)
        {
            this.$scrollContainer.off(event);
            return;
        }

        if (this.requestPending)
        {
            if (event)
            {
                event.preventDefault();
            }
            return;
        }

        event.preventDefault();

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

        var self = this;
        self.requestPending = true;

        this.action = self.buildUrl();
        var event = $.Event('infinite-scroll:before'),
            config = {
                handler: this,
                method: self.options.method,
                action: self.action,
                successCallback: $.proxy(this, 'processResponse'),
                ajaxOptions: { skipDefault: true }
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

    processResponse: function(data, status, xhr)
    {
        if (typeof data !== 'object')
        {
            XF.alert('Response was not JSON.');
            return;
        }

        this.currentPage++;
        var errorEvent = $.Event('infinite-scroll:error'),
            hasError = false,
            $target = this.$target;

        var event = $.Event('infinite-scroll:response');
        $target.trigger(event, data, this);

        if (data.errorHtml)
        {
            $target.trigger(errorEvent, data, this);
            if (!errorEvent.isDefaultPrevented())
            {
                XF.setupHtmlInsert(data.errorHtml, function($html, container)
                {
                    var title = container.h1 || container.title || XF.phrase('oops_we_ran_into_some_problems');
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
        else if (data.status === 'ok' && data.html)
        {
            var self = this;
            XF.setupHtmlInsert(data.html, function($html, container)
            {
                self.appendPage($html, container);
                self.updateUrl(container);
            });
        }

        event = $.Event('infinite-scroll:complete');
        $target.trigger(event, data, this);
        if (event.isDefaultPrevented())
        {
            return;
        }
    },

    /**
     * Adds new page to end of the container
     *
     * @param $html
     * @param container
     */
    appendPage: function($html, container)
    {
      $append = $html.find(this.options.append);
      $append.hide();
      this.$container.append($append);
      $append.xfFadeDown(null, XF.layoutChange);
    },

    updateUrl: function(container)
    {
        if (this.options.history === 'replace')
        {
            window.location.href = this.action;
        }
        else
        {
            history.pushState(container.title, this.action);
        }
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
        var lastCall = -1;
        return function()
        {
            clearTimeout(lastCall);
            var args = arguments;
            var self = this;
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
        var scrollPosition = this.$scrollContainer.scrollTop();
        return scrollPosition >= this.bottomPosition - this.options.scrollThreshold;
    },

    buildUrl: function()
    {
        return this.options.action + 'page-' + (this.currentPage + 1);
    }
});

XF.Element.register('infinite-scroll', 'XF.ShinkaInfiniteScroll');