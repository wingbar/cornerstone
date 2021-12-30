import { hooks } from '@bigcommerce/stencil-utils';
import CatalogPage from './catalog';
import compareProducts from './global/compare-products';
import FacetedSearch from './common/faceted-search';
import { createTranslationDictionary } from '../theme/common/utils/translations-utils';
import { alertModal } from './global/modal';
import utils from '@bigcommerce/stencil-utils';
import cartEditing from './cart/cart-editing'



export default class Category extends CatalogPage {
    constructor(context) {
        super(context);
        this.validationDictionary = createTranslationDictionary(context);
    }

    setLiveRegionAttributes($element, roleType, ariaLiveStatus) {
        $element.attr({
            role: roleType,
            'aria-live': ariaLiveStatus,
        });
    }

    makeShopByPriceFilterAccessible() {
        if (!$('[data-shop-by-price]').length) return;

        if ($('.navList-action').hasClass('is-active')) {
            $('a.navList-action.is-active').focus();
        }

        $('a.navList-action').on('click', () => this.setLiveRegionAttributes($('span.price-filter-message'), 'status', 'assertive'));
    }

    onReady() {

        let categoryItems = []
        $('li.product').each(function(index, product){
            categoryItems.push({'quantity': 1, 'productId': $('.quickview', this).attr('data-product-id')})
        })

        this.arrangeFocusOnSortBy();

        $('[data-button-type="add-cart"]').on('click', (e) => this.setLiveRegionAttributes($(e.currentTarget).next(), 'status', 'polite'));

        this.makeShopByPriceFilterAccessible();

        compareProducts(this.context);


        if ($('#facetedSearch').length > 0) {
            this.initFacetedSearch();
        } else {
            this.onSortBySubmit = this.onSortBySubmit.bind(this);
            hooks.on('sortBy-submitted', this.onSortBySubmit);
        }

        $('a.reset-btn').on('click', () => this.setLiveRegionsAttributes($('span.reset-message'), 'status', 'polite'));


        this.ariaNotifyNoProducts();

        let add_cart_id = document.querySelector('.add-all-cart').getAttribute('data-cart-id');
        $('.add-all-cart').on('click', () => this.addAllCart(add_cart_id));

        if ($('.remove-all-cart').length > 0) {
            let cl_cart_id = document.querySelector('.remove-all-cart').getAttribute('data-cart-id');
            $('.remove-all-cart').on('click', () => this.removeAllCart(cl_cart_id));
            
        }

        

    }


    removeAllCart(cartId){

        
        fetch('/api/storefront/carts/' + cartId, {
            method: "DELETE",
            credentials: "same-origin",
        })
        
        .then(response => {
            if (response.ok) {
                let modal = alertModal()
                modal.open()
                modal.updateContent(`<h3>Cart Cleared.</h3>`, { wrap: true });
                window.setTimeout(function(){location.reload()},3000);

                $('.cart-quantity')
                    .text("")
                    .toggleClass('countPill');
                if (utils.tools.storage.localStorageAvailable()) {
                    localStorage.setItem('cart-quantity', 0);
                }                
            }
        })
        .catch(error => console.log(error));
    }


    addAllCart(cartId) {
        const data = { lineItems: this.getAllCategoryProductIds() }

               cartEditing
                    .getCart(
                        '/api/storefront/cart/?include=lineItems.digitalItems.options,lineItems.physicalItems.options'
                    )
                    .then((existingCart) => {
                        if (existingCart[0]?.id) {
                            cartEditing
                                .addCartItem('/api/storefront/carts/', existingCart[0].id, data)
                                .then((response) => {
                                    let modal = alertModal()
                                    modal.open()
                                    modal.updateContent(`<h3>All available items added to cart</h3> <p>This message will close shortly.</p>`, { wrap: true });
                                    window.setTimeout(function(){location.reload()},3000);

                                })
                                .catch(error => console.log(error));
                            } else {
                            cartEditing
                                .createCart('/api/storefront/cart', data)
                                .then((response) => {
                                    let modal = alertModal()
                                    modal.open()
                                    modal.updateContent(`<h3>All available items added to cart</h3> <p>This message will close shortly.</p>`, { wrap: true });
                                    window.setTimeout(function(){location.reload()},3000);
                                })
                                .catch(error => console.log(error));
                            
                            }
                    })
        }
    

        getAllCategoryProductIds() {
            const ids = []
            // pull id's for each item on the page
            $('[data-product-id]').each((index, ele) => {
                ids.push($(ele).attr('data-product-id'))
            })
    
            return ids.map((id) => ({
                quantity: 1,
                productId: id,
            }))
        }


    ariaNotifyNoProducts() {
        const $noProductsMessage = $('[data-no-products-notification]');
        if ($noProductsMessage.length) {
            $noProductsMessage.focus();
        }
    }

    initFacetedSearch() {
        const {
            price_min_evaluation: onMinPriceError,
            price_max_evaluation: onMaxPriceError,
            price_min_not_entered: minPriceNotEntered,
            price_max_not_entered: maxPriceNotEntered,
            price_invalid_value: onInvalidPrice,
        } = this.validationDictionary;
        const $productListingContainer = $('#product-listing-container');
        const $facetedSearchContainer = $('#faceted-search-container');
        const productsPerPage = this.context.categoryProductsPerPage;
        const requestOptions = {
            config: {
                category: {
                    shop_by_price: true,
                    products: {
                        limit: productsPerPage,
                    },
                },
            },
            template: {
                productListing: 'category/product-listing',
                sidebar: 'category/sidebar',
            },
            showMore: 'category/show-more',
        };

        this.facetedSearch = new FacetedSearch(requestOptions, (content) => {
            $productListingContainer.html(content.productListing);
            $facetedSearchContainer.html(content.sidebar);

            $('body').triggerHandler('compareReset');

            $('html, body').animate({
                scrollTop: 0,
            }, 100);
        }, {
            validationErrorMessages: {
                onMinPriceError,
                onMaxPriceError,
                minPriceNotEntered,
                maxPriceNotEntered,
                onInvalidPrice,
            },
        });
    }
}
