/*
 * Copyright 2019-2020 SURF.
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
import { ApiClient } from "api";
import SubscriptionDetails from "components/subscriptionDetail/SubscriptionDetails";
import React, { useContext, useEffect, useState } from "react";
import { FormattedMessage } from "react-intl";
import ApplicationContext from "utils/ApplicationContext";
import { enrichSubscription } from "utils/Lookups";
import { SubscriptionModel } from "utils/types";

function SubscriptionInstanceValueRow({
    label,
    value,
    isSubscriptionValue,
    isDeleted,
    isExternalLinkValue,
    toggleCollapsed,
    type,
    children,
}: React.PropsWithChildren<{
    label: string;
    value: string;
    isSubscriptionValue: boolean;
    isDeleted: boolean;
    isExternalLinkValue: boolean;
    toggleCollapsed: () => void;
    type: string;
}>) {
    const icon = children ? "minus" : "plus";

    return (
        <tbody>
            <tr>
                <td>{label.toUpperCase()}</td>
                <td colSpan={isDeleted ? 1 : 2}>
                    <div className="resource-type">
                        {isExternalLinkValue && !isDeleted && (
                            <i className={`fa fa-${icon}-circle`} onClick={toggleCollapsed} />
                        )}
                        {isSubscriptionValue && (
                            <a target="_blank" rel="noopener noreferrer" href={`/subscriptions/${value}`}>
                                {value}
                            </a>
                        )}

                        {!isSubscriptionValue && <span>{value?.toString()}</span>}
                    </div>
                </td>
                {isDeleted && (
                    <td>
                        <em className="error">
                            <FormattedMessage id={`subscription.${type}.removed`} />
                        </em>
                    </td>
                )}
            </tr>
            {children && isExternalLinkValue && !isDeleted && (
                <tr className="related-subscription">
                    <td className="whitespace" />
                    <td className="related-subscription-values" colSpan={2}>
                        {children}
                    </td>
                </tr>
            )}
        </tbody>
    );
}

interface IProps {
    label: string;
    value: string;
}

export function getExternalTypeData(
    type: string,
    apiClient: ApiClient
): { getter: (identifier: string) => Promise<any>; render?: (data: any) => React.ReactNode; i18nKey: string } {
    switch (type) {
        case "node_a_subscription_id":
        case "node_z_subscription_id":
        case "node_enrollment_subscription_id":
        case "node_subscription_id":
        case "physical_connection_subscription_id":
        case "prefix_list_subscription_id":
        case "mirror_sources_subscription_id":
        case "service_edge_subscription_id":
            return {
                getter: (identifier: string) => apiClient.subscriptionsDetailWithModel(identifier),
                render: (data: SubscriptionModel) => (
                    <SubscriptionDetails subscription={data} className="related-subscription" />
                ),
                i18nKey: "subscription",
            };
        default:
            return {
                getter: (_: string) => Promise.resolve({}),
                render: undefined,
                i18nKey: "",
            };
    }
}

export default function SubscriptionInstanceValue({ label, value }: IProps) {
    const [collapsed, setCollapsed] = useState(true);
    const [data, setData] = useState<any | null | undefined>(undefined);

    const { organisations, products, apiClient } = useContext(ApplicationContext);
    const { render, i18nKey, getter } = getExternalTypeData(label, apiClient);

    const isSubscriptionValue = label.endsWith("subscription_id");
    const isExternalLinkValue = !!render;
    const isDeleted = isExternalLinkValue && data === null;

    useEffect(() => {
        if (data === undefined && !collapsed && isExternalLinkValue) {
            getter(value)
                .catch((err) => Promise.resolve(null))
                .then((data) => {
                    if (data && isSubscriptionValue) {
                        data.product_id = data.product.product_id;
                        enrichSubscription(data as SubscriptionModel, organisations, products);
                    }
                    setData(data);
                });
        }
    }, [data, collapsed, isSubscriptionValue, isExternalLinkValue, getter, value, organisations, products]);

    return (
        <SubscriptionInstanceValueRow
            label={label}
            value={value}
            isSubscriptionValue={isSubscriptionValue}
            isDeleted={isDeleted}
            isExternalLinkValue={isExternalLinkValue}
            toggleCollapsed={() => setCollapsed(!collapsed)}
            type={i18nKey}
        >
            {!!data && !collapsed && !!render && render(data)}
        </SubscriptionInstanceValueRow>
    );
}
