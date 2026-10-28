import "lite-youtube-embed";
import BasePage from "./base-page";
import Lightbox from "fslightbox";
window.fslightbox = Lightbox;

class Home extends BasePage {
    onReady() {
        this.initFeaturedTabs();
        this.initHeroAutoplayControl();
    }

    /**
     * Pause/play button for the automatic slide change of the hero slider (WCAG 2.2.2).
     * Used in views/components/home/AR-Hero-section.twig, which only renders the button and the autoplay
     * when there is more than one banner. The slider keeps its manual navigation in every state.
     */
    initHeroAutoplayControl() {
        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

        document.querySelectorAll('.AR-slider-hero-section').forEach(async section => {
            const toggle = section.querySelector('.hero-autoplay-toggle');
            const slider = section.querySelector('salla-slider');
            if (!toggle || !slider || toggle.dataset.ready) {
                return;
            }

            await customElements.whenDefined('salla-slider');

            // The Swiper instance is created after the component loads, so wait for it (bounded)
            let swiper;
            for (let attempt = 0; attempt < 20 && !swiper; attempt++) {
                swiper = await slider.sliderInstance?.();
                swiper || (await new Promise(resolve => setTimeout(resolve, 250)));
            }

            // No autoplay (single banner): keep the button hidden
            if (!swiper?.autoplay || !swiper.params.autoplay || toggle.dataset.ready) {
                return;
            }
            toggle.dataset.ready = 'true';

            // Once the visitor pauses, nothing (hover, tab visibility, slide change, motion setting) restarts it
            let pausedByUser = false;

            const iconPause = toggle.querySelector('.icon-pause');
            const iconPlay = toggle.querySelector('.icon-play');
            const render = () => {
                const playing = swiper.autoplay.running;
                toggle.setAttribute('aria-label', playing ? toggle.dataset.labelPause : toggle.dataset.labelPlay);
                iconPause.toggleAttribute('hidden', !playing);
                iconPlay.toggleAttribute('hidden', playing);
            };

            toggle.addEventListener('click', () => {
                if (swiper.autoplay.running) {
                    pausedByUser = true;
                    swiper.autoplay.stop();
                } else {
                    pausedByUser = false;
                    swiper.autoplay.start();
                }
            });

            swiper.on('autoplayStart', render);
            swiper.on('autoplayStop', render);

            // Respect the system "reduce motion" setting on load and when it changes during the session
            const applyMotionPreference = () => {
                if (reducedMotion.matches) {
                    swiper.autoplay.stop();
                } else if (!pausedByUser) {
                    swiper.autoplay.start();
                }
            };
            reducedMotion.matches && swiper.autoplay.stop();
            reducedMotion.addEventListener('change', applyMotionPreference);

            render();
            toggle.removeAttribute('hidden');
        });
    }

    /**
     * used in views/components/home/featured-products-style*.twig
     */
    initFeaturedTabs() {
        app.all('.tab-trigger', el => {
            el.addEventListener('click', ({ currentTarget: btn }) => {
                let id = btn.dataset.componentId;
                // btn.setAttribute('fill', 'solid');
                app.toggleClassIf(`#${id} .tabs-wrapper>div`, 'is-active opacity-0 translate-y-3', 'inactive', tab => tab.id == btn.dataset.target)
                    .toggleClassIf(`#${id} .tab-trigger`, 'is-active', 'inactive', tabBtn => tabBtn == btn);

                // fadeIn active tabe
                setTimeout(() => app.toggleClassIf(`#${id} .tabs-wrapper>div`, 'opacity-100 translate-y-0', 'opacity-0 translate-y-3', tab => tab.id == btn.dataset.target), 100);
            })
        });
        document.querySelectorAll('.s-block-tabs').forEach(block => block.classList.add('tabs-initialized'));
    }
}

Home.initiateWhenReady(['index']);