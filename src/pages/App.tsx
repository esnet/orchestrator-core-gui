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

import "../locale/en";
import "../locale/nl";
import "./App.scss";

import { createBrowserHistory } from "history";
import React from "react";
import { Redirect, Route, Router, Switch } from "react-router-dom";
import { QueryParamProvider } from "use-query-params";

import { assignees, locationCodes, organisations, processStatuses, products, reportError } from "../api";
import ErrorDialog from "../components/ErrorDialog";
import Flash from "../components/Flash";
import Header from "../components/Header";
import Navigation from "../components/Navigation";
import ProductPage from "../components/Product";
import ProductBlock from "../components/ProductBlock";
import ProtectedRoute from "../components/ProtectedRoute";
import ApplicationContext, { ApplicationContextInterface } from "../utils/ApplicationContext";
import { getParameterByName, getQueryParameters } from "../utils/QueryParameters";
import { AppError } from "../utils/types";
import Help from "./Help";
import MetaData from "./MetaData";
import ModifySubscription from "./ModifySubscription";
import NewProcess from "./NewProcess";
import NewTask from "./NewTask";
import NotAllowed from "./NotAllowed";
import NotFound from "./NotFound";
import Prefixes from "./Prefixes";
import ProcessDetail from "./ProcessDetail";
import Processes from "./ProcessesV2";
import ServerError from "./ServerError";
import Settings from "./Settings";
import SubscriptionDetail from "./SubscriptionDetail";
import SubscriptionsPage from "./Subscriptions";
import SubscriptionsOld from "./SubscriptionsOld";
import Tasks from "./TasksV2";
import TerminateSubscription from "./TerminateSubscription";
import Validations from "./Validations";

const history = createBrowserHistory();

interface IState {
    loading: boolean;
    loaded: boolean;
    applicationContext: ApplicationContextInterface;
    error: boolean;
    errorDialogOpen: boolean;
    errorDialogAction: () => void;
}

class App extends React.PureComponent<{}, IState> {
    constructor(props: {}, context: ApplicationContextInterface) {
        super(props, context);
        this.state = {
            loading: true,
            loaded: false,
            applicationContext: {
                organisations: [],
                locationCodes: [],
                assignees: [],
                processStatuses: [],
                products: [],
                redirect: url => history.push(url)
            },
            error: false,
            errorDialogOpen: false,
            errorDialogAction: () => {
                this.setState({ errorDialogOpen: false });
            }
        };
        window.onerror = (msg, url, line, col, err?: AppError) => {
            if (err && err.response && (err.response.status === 401 || err.response.status === 403)) {
                return;
            }

            this.setState({ errorDialogOpen: true });
            const info: Partial<AppError> = err || {};
            const response: Partial<Response> = info.response || {};
            const error = {
                userAgent: navigator.userAgent,
                message: msg,
                url: url,
                line: line,
                col: col,
                error: info.message,
                stack: info.stack,
                targetUrl: response.url,
                status: response.status
            };
            reportError(error);
        };

        history.listen(() => {
            if (!this.state.loading) {
                this.loadData();
            }
        });
    }

    async componentDidMount() {
        await this.loadData();
    }

    async loadData() {
        if (window.location.pathname.endsWith("/error") || window.location.pathname.endsWith("/not-allowed")) {
            this.setState({ loading: false });
            return;
        }

        if (this.state.loaded) {
            return;
        }

        const [allOrganisations, allProducts, allLocationCodes, allAssignees, allProcessStatuses] = await Promise.all([
            organisations(),
            products(),
            locationCodes(),
            assignees(),
            processStatuses()
        ]);

        const filterdProducts = (allProducts || []).sort((a, b) => a.name.localeCompare(b.name));

        this.setState({
            loading: false,
            loaded: true,
            applicationContext: {
                organisations: allOrganisations || [],
                locationCodes: allLocationCodes || [],
                assignees: allAssignees || [],
                processStatuses: allProcessStatuses || [],
                products: filterdProducts || [],
                redirect: url => history.push(url)
            }
        });
    }

    render() {
        const { loading, errorDialogAction, errorDialogOpen, applicationContext } = this.state;

        if (loading) {
            return null; // render null when app is not ready yet for static mySpinner
        }

        return (
            <Router history={history}>
                <QueryParamProvider ReactRouterRoute={Route}>
                    <ApplicationContext.Provider value={applicationContext}>
                        <div>
                            <div>
                                <Flash />
                                <Header />
                                <Navigation />
                                <ErrorDialog isOpen={errorDialogOpen} close={errorDialogAction} />
                            </div>
                            <Switch>
                                <Route exact path="/authorize" render={() => <Redirect to="/" />} />
                                <Route exact path="/" render={() => <Redirect to="/processes" />} />
                                <ProtectedRoute path="/processes" render={props => <Processes />} />
                                <ProtectedRoute
                                    path="/validations/:type"
                                    render={props => <Validations match={props.match} />}
                                />
                                <ProtectedRoute
                                    path="/new-process"
                                    render={props => (
                                        <NewProcess preselectedInput={getQueryParameters(props.location.search)} />
                                    )}
                                />
                                <ProtectedRoute
                                    path="/modify-subscription"
                                    render={props => (
                                        <ModifySubscription
                                            workflowName={getParameterByName("workflow", props.location.search)}
                                            subscriptionId={getParameterByName("subscription", props.location.search)}
                                        />
                                    )}
                                />
                                <ProtectedRoute
                                    path="/terminate-subscription"
                                    render={props => (
                                        <TerminateSubscription
                                            subscriptionId={getParameterByName("subscription", props.location.search)}
                                        />
                                    )}
                                />
                                <Route
                                    path="/process/:id"
                                    render={props => <ProcessDetail {...props} isProcess={true} />}
                                />
                                <Route path="/subscriptions" render={props => <SubscriptionsPage {...props} />} />
                                <Route path="/subscriptions-old" render={props => <SubscriptionsOld {...props} />} />
                                <Route path="/subscription/:id" render={props => <SubscriptionDetail {...props} />} />
                                <Route path="/subscription/:id" render={props => <SubscriptionDetail {...props} />} />
                                <ProtectedRoute
                                    path="/metadata/:type"
                                    render={props => <MetaData match={props.match} />}
                                />
                                <ProtectedRoute
                                    path="/product/:id"
                                    render={props => <ProductPage match={props.match} />}
                                />
                                <ProtectedRoute
                                    path="/product-block/:id"
                                    render={props => <ProductBlock match={props.match} />}
                                />
                                <ProtectedRoute path="/settings" render={() => <Settings />} />
                                <ProtectedRoute path="/tasks" render={() => <Tasks />} />
                                <ProtectedRoute path="/prefixes" render={() => <Prefixes />} />
                                <ProtectedRoute path="/new-task" render={() => <NewTask />} />
                                <Route
                                    path="/task/:id"
                                    render={props => <ProcessDetail {...props} isProcess={false} />}
                                />
                                <Route path="/help" render={() => <Help />} />
                                <Route path="/not-allowed" render={() => <NotAllowed />} />
                                <Route path="/error" render={props => <ServerError {...props} />} />
                                <Route component={NotFound} />
                            </Switch>
                        </div>
                    </ApplicationContext.Provider>
                </QueryParamProvider>
            </Router>
        );
    }
}

export default App;
