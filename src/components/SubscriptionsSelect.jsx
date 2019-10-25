/*
 * Copyright 2019 SURF.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

import React from "react";
import I18n from "i18n-js";
import PropTypes from "prop-types";
import Select from "react-select";

import { subscriptionsByProductId, allSubscriptions } from "../api";
import { capitalizeFirstLetter, isEmpty } from "../utils/Utils";
import "./SubscriptionsSelect.scss";

export default class SubscriptionsSelect extends React.PureComponent {
    constructor(props) {
        super(props);
        const { subscriptions, minimum } = this.props;
        const nboxes = subscriptions.length > minimum ? subscriptions.length : minimum;
        this.state = {
            availableSubscriptions: [],
            numberOfBoxes: nboxes
        };
    }

    componentDidMount = () => {
        const { productId } = this.props;
        if (productId) {
            subscriptionsByProductId(productId).then(result =>
                this.setState({ availableSubscriptions: result, loading: false })
            );
        } else {
            allSubscriptions().then(result => this.setState({ availableSubscriptions: result, loading: false }));
        }
    };

    componentWillReceiveProps(nextProps) {
        if (nextProps.productId && nextProps.productId !== this.props.productId) {
            this.componentDidMount(nextProps.productId);
        } else if (isEmpty(nextProps.productId)) {
            this.setState({ availableSubscriptions: [] });
        }
    }

    onChangeInternal = index => selection => {
        const { subscriptions } = this.props;
        if (selection && selection.value) {
            subscriptions[index] = selection.value;
        } else {
            subscriptions[index] = null;
        }
        this.props.onChange(subscriptions);
    };

    addSubscription() {
        const nboxes = this.state.numberOfBoxes + 1;
        this.setState({ numberOfBoxes: nboxes });
    }

    removeSubscription(index) {
        const { subscriptions } = this.props;
        const nboxes = this.state.numberOfBoxes - 1;
        if (subscriptions.length > nboxes) {
            subscriptions.splice(index, 1);
            this.props.onChange(subscriptions);
        }
        this.setState({ numberOfBoxes: nboxes });
    }

    render() {
        const { availableSubscriptions, numberOfBoxes } = this.state;
        const { productId, disabled, subscriptions, minimum, maximum, errors } = this.props;
        const placeholder = productId
            ? I18n.t("subscription_select.placeholder")
            : I18n.t("subscription_select.select_product");
        const showAdd = maximum > minimum && subscriptions.length < maximum;
        const boxes =
            subscriptions.length < numberOfBoxes
                ? subscriptions.concat(Array(numberOfBoxes - subscriptions.length).fill(null))
                : subscriptions;
        const rootFieldErrors = errors.filter(error => error.loc.length === 1);

        return (
            <section className="multiple-subscriptions">
                <section className="subscription-select">
                    {boxes.map((subscription, index) => {
                        const fieldErrors = errors.filter(error => error.loc[1] === index && error.loc.length === 3);
                        const options = availableSubscriptions
                            .filter(
                                x => x.subscription_id === subscription || !subscriptions.includes(x.subscription_id)
                            )
                            .map(x => ({
                                value: x.subscription_id,
                                label: x.description
                            }));

                        const value = options.find(option => option.value === subscription);

                        return (
                            <div className="wrapper" key={index}>
                                <div className="select-box" key={index}>
                                    <Select
                                        onChange={this.onChangeInternal(index)}
                                        key={index}
                                        options={options}
                                        value={value}
                                        isSearchable={true}
                                        isDisabled={disabled || availableSubscriptions.length === 0}
                                        placeholder={placeholder}
                                    />
                                </div>
                                {fieldErrors && (
                                    <em className="error">
                                        {fieldErrors.map((e, index) => (
                                            <div key={index}>
                                                {capitalizeFirstLetter(e.loc[2])}: {capitalizeFirstLetter(e.msg)}.
                                            </div>
                                        ))}
                                    </em>
                                )}

                                {maximum > minimum && (
                                    <i
                                        className={`fa fa-minus ${index < minimum ? "disabled" : ""}`}
                                        onClick={this.removeSubscription.bind(this, index)}
                                    />
                                )}
                            </div>
                        );
                    })}

                    {rootFieldErrors && (
                        <em className="error root-error">
                            {rootFieldErrors.map((e, index) => (
                                <div key={index}>{capitalizeFirstLetter(e.msg)}.</div>
                            ))}
                        </em>
                    )}

                    {showAdd && (
                        <div className="add-subscription">
                            <i className="fa fa-plus" onClick={this.addSubscription.bind(this)} />
                        </div>
                    )}
                </section>
            </section>
        );
    }
}

SubscriptionsSelect.propTypes = {
    onChange: PropTypes.func.isRequired,
    productId: PropTypes.string,
    disabled: PropTypes.bool,
    subscriptions: PropTypes.array,
    minimum: PropTypes.number,
    maximum: PropTypes.number
};

SubscriptionsSelect.defaultProps = {
    minimum: 1,
    maximum: 1
};
