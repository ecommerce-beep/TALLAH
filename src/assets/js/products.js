import BasePage from './base-page';
import MobileMenu from 'mmenu-light';
class Products extends BasePage {
    onReady() {
        let productsList = app.element('salla-products-list'),
            urlParams = new URLSearchParams(window.location.search)


        // Set Sort
        if (urlParams.has('sort')) {
            app.element('#product-filter').value = urlParams.get('sort');
        }


        // Sort Products
        app.on('change', '#product-filter', async event => {
            window.history.replaceState(null, null, salla.helpers.addParamToUrl('sort', event.currentTarget.value));
            productsList.sortBy = event.currentTarget.value;
            await productsList.reload();
            productsList.setAttribute('filters', `{"sort": "${event.currentTarget.value}"}`)
        });

        salla.event.once('salla-products-list::products.fetched', res=>{
            if (!res.title) {
                return;
            }

            // The page title is rendered by the server (desktop and mobile headings)
            const titles = document.querySelectorAll('[id^="page-main-title"]');
            const hasServerTitle = Array.from(titles).some(title => title.textContent.trim());

            // Search pages build their title from the query, and a heading without a title has nothing to preserve
            if (res.source === 'search' || !hasServerTitle) {
                titles[0] && (titles[0].innerHTML = res.title);
                return;
            }

            // res.title is "name - count", but the name is missing when the category is not part of the filters,
            // leaving only the count. Keep the real title and show the count next to it as a separate element
            const total = res.data ? res.data.length : 0;
            let countText = salla.lang.choice('blocks.header.products_count', total);
            if (total === 15) {
                countText = countText.replace(total, salla.lang.get('common.elements.more_than') + ' ' + total);
            }

            titles.forEach(title => {
                const oldCount = title.querySelector('.products-count');
                oldCount && oldCount.remove();

                const count = document.createElement('span');
                count.className = 'products-count mx-1 text-sm font-normal text-gray-500';
                count.textContent = countText;
                title.appendChild(count);
            });
        });


        this.initiateMobileMenu()
    }

    initiateMobileMenu() {
        let filters = app.element("#filters-menu"),
            trigger = app.element("a[href='#filters-menu']"),
            close = app.element("button.close-filters");

        if (!filters) {
            return;
        }
        filters = new MobileMenu(filters, "(max-width: 1024px)", "( slidingSubmenus: false)");
        const drawer = filters.offcanvas({ position: salla.config.get('theme.is_rtl') ? "right" : 'left' });
        trigger.addEventListener('click', event => {
            document.body.classList.add('filters-opened');
            event.preventDefault() || drawer.close() || drawer.open()
        });
        close.addEventListener('click', event => {
            document.body.classList.remove('filters-opened');
            event.preventDefault() || drawer.close()
        });
        salla.event.on('salla-filters::changed', filters => {
            if (!Object.entries(filters).length) {
                return
            }
            document.body.classList.remove('filters-opened');
            drawer.close()
        })
    }
}

Products.initiateWhenReady([
    'product.index',
    'product.index.latest',
    'product.index.offers', 'product.index.search',
    'product.index.tag',
]);
