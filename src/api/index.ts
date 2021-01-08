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
import I18n from "i18n-js";
import { setFlash } from "utils/Flash";
import {
    ContactPerson,
    Dienstafname,
    EngineStatus,
    FixedInputConfiguration,
    IMSNode,
    IMSPort,
    IMSService,
    IpBlock,
    IpPrefix,
    IpPrefixSubscription,
    Organization,
    ProcessSubscription,
    ProcessWithDetails,
    Product,
    ProductBlock,
    ProductValidation,
    ResourceType,
    ServicePortFilterItem,
    ServicePortSubscription,
    Subscription,
    SubscriptionModel,
    SubscriptionProcesses,
    Workflow,
    WorkflowReasons,
    WorkflowWithProductTags
} from "utils/types";
import { isEmpty } from "utils/Utils";

import axiosInstance from "./axios";

export function catchErrorStatus<T>(promise: Promise<any>, status: number, callback: (json: T) => void) {
    return promise.catch(err => {
        if (err.response && err.response.status === status) {
            callback(err.response.data);
        } else {
            throw err;
        }
    });
}

function fetchJson<R = {}>(
    path: string,
    options = {},
    headers = {},
    showErrorDialog = true,
    result = true
): Promise<R> {
    return axiosFetch(path, options, headers, showErrorDialog, result);
}

function fetchJsonWithCustomErrorHandling<R = {}>(path: string): Promise<R> {
    return fetchJson<R>(path, {}, {}, false, true);
}

function postPutJson<R = {}>(
    path: string,
    body: {},
    method: string,
    showErrorDialog = true,
    result = true
): Promise<R> {
    return axiosFetch<R>(path, { method: method, data: body }, {}, showErrorDialog, result);
}

function axiosFetch<R = {}>(
    path: string,
    options = {},
    headers = {},
    showErrorDialog = true,
    result = true
): Promise<R> {
    // preset the config with the relative URL and a GET type.
    // presets can be overridden with `options`.
    return axiosInstance({ url: path, method: "GET", ...options })
        .then(res => res.data)
        .catch(err => {
            if (showErrorDialog) {
                setTimeout(() => {
                    throw err;
                }, 250);
            }
            throw err;
        });
}

//API metadata
export function products(): Promise<Product[]> {
    return fetchJson("products/");
}

export function productTags(): Promise<string[]> {
    return fetchJson("products/tags/all");
}

export function productTypes(): Promise<string[]> {
    return fetchJson("products/types/all");
}

export function productStatuses(): Promise<string[]> {
    return fetchJson("products/statuses/all");
}

export function productById(productId: string): Promise<Product> {
    return fetchJson(`products/${productId}`);
}

export function saveProduct(product: Product) {
    return postPutJson("products", product, isEmpty(product.product_id) ? "post" : "put", true, false);
}

export function deleteProduct(id: string): Promise<null> {
    return fetchJson(`products/${id}`, { method: "DELETE" }, {}, false, false);
}

export function productBlocks(): Promise<ProductBlock[]> {
    return fetchJson("product_blocks/");
}

export function productBlockById(id: string): Promise<ProductBlock> {
    return fetchJson(`product_blocks/${id}`);
}

export function saveProductBlock(productBlock: ProductBlock) {
    return postPutJson(
        "product_blocks",
        productBlock,
        isEmpty(productBlock.product_block_id) ? "post" : "put",
        true,
        false
    );
}

export function deleteProductBlock(id: string) {
    return fetchJson(`product_blocks/${id}`, { method: "DELETE" }, {}, false, false);
}

export function resourceTypes(): Promise<ResourceType[]> {
    return fetchJson("resource_types/");
}

export function resourceType(id: string) {
    return fetchJson(`resource_types/${id}`);
}

//API
export function subscriptionsDetailWithModel(subscription_id: string): Promise<SubscriptionModel> {
    return fetchJsonWithCustomErrorHandling<SubscriptionModel>(`subscriptions/domain-model/${subscription_id}`);
}

export function nodeSubscriptions(statusList: string[] = []): Promise<Subscription[]> {
    return subscriptions(["Node"], statusList);
}

export function portSubscriptions(
    tagList: string[] = [],
    statusList: string[] = [],
    productList: string[] = []
): Promise<ServicePortSubscription[]> {
    const statusFilter = `statuses,${encodeURIComponent(statusList.join("-"))}`;
    const tagsFilter = `tags,${encodeURIComponent(tagList.join("-"))}`;
    const productsFilter = `products,${encodeURIComponent(productList.join("-"))}`;

    const params = new URLSearchParams();
    const filters = [];
    if (tagList.length) filters.push(tagsFilter);
    if (statusList.length) filters.push(statusFilter);
    if (productList.length) filters.push(productsFilter);

    if (filters.length) params.set("filter", filters.join(","));

    return fetchJson(`subscriptions/ports${filters.length ? "?" : ""}${params.toString()}`);
}

export function subscriptions(
    tagList: string[] = [],
    statusList: string[] = [],
    productList: string[] = []
): Promise<Subscription[]> {
    const statusFilter = `statuses,${encodeURIComponent(statusList.join("-"))}`;
    const tagsFilter = `tags,${encodeURIComponent(tagList.join("-"))}`;
    const productsFilter = `products,${encodeURIComponent(productList.join("-"))}`;

    const params = new URLSearchParams();
    const filters = [];
    if (tagList.length) filters.push(tagsFilter);
    if (statusList.length) filters.push(statusFilter);
    if (productList.length) filters.push(productsFilter);

    if (filters.length) params.set("filter", filters.join(","));

    return fetchJson(`subscriptions${filters.length ? "?" : ""}${params.toString()}`);
}

export function subscriptionWorkflows(subscription_id: string): Promise<WorkflowReasons> {
    return fetchJson(`subscriptions/workflows/${subscription_id}`);
}

export function organisations(): Promise<Organization[] | undefined> {
    //@ts-ignore
    return fetchJson("crm/organisations", {}, {}, false).catch(() => {
        setTimeout(() => {
            setFlash(
                I18n.t("external.errors.crm_unavailable", {
                    type: "Organisations"
                }),
                "error"
            );
        });
        return undefined;
    });
}

export function getPortSubscriptionsForNode(id: string): Promise<ServicePortFilterItem[]> {
    return fetchJson(`subscriptions/port-services-by-node/${id}`);
}

export function getNodesByLocationAndStatus(locationCode: string, status: string): Promise<IMSNode[]> {
    return fetchJson(`ims/nodes/${locationCode}/${status}`);
}

export function getFreePortsByNodeSubscriptionIdAndSpeed(
    nodeSubscriptionId: string,
    interfaceSpeed: number,
    mode: string
): Promise<IMSPort[]> {
    return fetchJson(`ims/free_ports/${nodeSubscriptionId}/${interfaceSpeed}/${mode}`);
}

export function usedVlans(subscriptionId: string): Promise<number[][]> {
    return fetchJsonWithCustomErrorHandling(`ims/vlans/${subscriptionId}`);
}

export function portByImsPortId(portId: number) {
    return fetchJson(`ims/port_by_ims_port/${portId}`);
}

export function internalPortByImsPortId(portId: number) {
    return fetchJson(`ims/internal_port_by_ims_port/${portId}`);
}

export function portByImsServiceId(serviceId: number): Promise<IMSPort> {
    return fetchJson(`ims/port_by_ims_service/${serviceId}`);
}

export function serviceByImsServiceId(serviceId: number): Promise<IMSService> {
    return fetchJson(`ims/service_by_ims_service_id/${serviceId}`);
}

export function parentSubscriptions(childSubscriptionId: string): Promise<Subscription[]> {
    return fetchJson(`subscriptions/parent_subscriptions/${childSubscriptionId}`);
}

export function processSubscriptionsBySubscriptionId(subscriptionId: string): Promise<SubscriptionProcesses[]> {
    return fetchJsonWithCustomErrorHandling<SubscriptionProcesses[]>(
        `processes/process-subscriptions-by-subscription-id/${subscriptionId}`
    ).catch(err => Promise.resolve([]));
}

export function processSubscriptionsByProcessId(processId: string): Promise<ProcessSubscription[]> {
    return fetchJsonWithCustomErrorHandling<ProcessSubscription[]>(
        `processes/process-subscriptions-by-pid/${processId}`
    ).catch(err => []);
}

export function locationCodes(): Promise<string[] | undefined> {
    // @ts-ignore
    return fetchJson("crm/location_codes", {}, {}, false).catch(() => {
        setTimeout(() => {
            setFlash(
                I18n.t("external.errors.crm_unavailable", {
                    type: "Locations"
                }),
                "error"
            );
        });
        return undefined;
    });
}

export function assignees(): Promise<string[]> {
    return fetchJson("processes/assignees");
}

export function processStatuses(): Promise<string[]> {
    return axiosFetch("processes/statuses");
}

export function allWorkflows(): Promise<Workflow[]> {
    return fetchJson("workflows");
}

export function allWorkflowsWithProductTags(): Promise<WorkflowWithProductTags[]> {
    return fetchJson("workflows/with_product_tags");
}

export function workflowsByTarget(target: string): Promise<Workflow[]> {
    return fetchJson(`workflows?target=${target}`);
}

export function deleteSubscription(subscriptionId: string) {
    return fetchJson(`subscriptions/${subscriptionId}`, { method: "DELETE" }, {}, true, false);
}

//IPAM IP Prefixes
export function ip_blocks(parentPrefix: number): Promise<IpBlock[]> {
    return fetchJson("ipam/ip_blocks/" + parentPrefix);
}

//IPAM the user-defined filters as configured in the database for the IP PREFIX product
export function prefix_filters(): Promise<IpPrefix[]> {
    return fetchJson("ipam/prefix_filters");
}

export function prefixSubscriptionsByRootPrefix(parentId: number): Promise<IpPrefixSubscription[]> {
    return fetchJson(`ipam/prefix_subscriptions/${parentId}`);
}

export function prefixSubscriptions() {
    return fetchJson(`ipam/prefix_subscriptions/`);
}

export function prefixById(prefixId: number) {
    return fetchJsonWithCustomErrorHandling(`ipam/prefix_by_id/${prefixId}`);
}

export function addressById(addressId: number) {
    return fetchJsonWithCustomErrorHandling(`ipam/address_by_id/${addressId}`);
}

export function freeSubnets(supernet: string): Promise<string[]> {
    return fetchJson(`ipam/free_subnets/${supernet}`);
}

export function subnets(subnet: string, netmask: number, prefixlen: number) {
    return fetchJson("ipam/subnets/" + subnet + "/" + netmask + "/" + prefixlen);
}

export function free_subnets(subnet: string, netmask: number, prefixlen: number): Promise<string[]> {
    return fetchJson("ipam/free_subnets/" + subnet + "/" + netmask + "/" + prefixlen);
}

export function deleteProcess(processId: string) {
    return fetchJson(`processes/${processId}`, { method: "DELETE" }, {}, true, false);
}

export function abortProcess(processId: string) {
    return fetchJson(`processes/${processId}/abort`, { method: "PUT" }, {}, true, false);
}

export function process(processId: string): Promise<ProcessWithDetails> {
    return fetchJsonWithCustomErrorHandling("processes/" + processId);
}

export function startProcess(workflow_name: string, process: {}[]): Promise<{ id: string }> {
    return postPutJson("processes/" + workflow_name, process, "post", false, true);
}

export function resumeProcess(processId: string, userInput: {}[]) {
    return postPutJson(`processes/${processId}/resume`, userInput, "put", false, false);
}

export function retryProcess(processId: string) {
    return postPutJson(`processes/${processId}/resume`, {}, "put", true, false);
}

export function fixedInputConfiguration(): Promise<FixedInputConfiguration> {
    return fetchJson("fixed_inputs/configuration");
}

export function validation(productId: string): Promise<ProductValidation> {
    return fetchJson(`products/${productId}/validate`);
}

export function contacts(organisationId: string): Promise<ContactPerson[]> {
    return fetchJson<ContactPerson[]>(`crm/contacts/${organisationId}`, {}, {}, false, true).catch(err =>
        Promise.resolve([])
    );
}

export function reportError(error: {}) {
    return postPutJson("user/error", error, "post", false);
}

export function clearCache(name: string) {
    return postPutJson(`settings/cache/${name}`, {}, "delete", true, false);
}

export function getGlobalStatus(): Promise<EngineStatus> {
    return fetchJson("settings/status", {}, {}, false, true);
}

export function setGlobalStatus(new_global_lock: boolean) {
    return postPutJson("settings/status", { global_lock: new_global_lock }, "put");
}

export function logUserInfo(username: string, message: string) {
    return postPutJson(`user/log/${username}`, { message: message }, "post", true, false);
}

export function dienstafnameBySubscription(subscriptionId: string): Promise<Dienstafname | undefined> {
    return fetchJson<Dienstafname>(`crm/dienstafname/${subscriptionId}`, {}, {}, false).catch(err =>
        Promise.resolve(undefined)
    );
}
