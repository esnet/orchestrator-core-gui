import React from "react";
import { Redirect, Route, Switch } from "react-router-dom";
import { createBrowserHistory as createHistory } from "history";
import { Router } from "react-router";
import "./App.scss";
import ErrorDialog from "../components/ErrorDialog";
import Flash from "../components/Flash";
import ProtectedRoute from "../components/ProtectedRoute";
import NotFound from "./NotFound";
import Help from "./Help";
import Processes from "./Processes";
import OldSubscriptions from "./OldSubscriptions";
import Subscriptions from "./Subscriptions";
import Validations from "./Validations";
import NewProcess from "./NewProcess";
import ProcessDetail from "./ProcessDetail";
import SubscriptionDetail from "./SubscriptionDetail";
import ServerError from "./ServerError";
import NotAllowed from "./NotAllowed";
import Header from "../components/Header";
import Navigation from "../components/Navigation";
import { config, locationCodes, me, organisations, products, redirectToAuthorizationServer, reportError } from "../api";
import "../locale/en";
import "../locale/nl";
import { getParameterByName, getQueryParameters } from "../utils/QueryParameters";
import TerminateSubscription from "./TerminateSubscription";
import MetaData from "./MetaData";
import ProductBlock from "../components/ProductBlock";
import ResourceType from "../components/ResourceType";
import Product from "../components/Product";
import Cache from "./Cache";
import Tasks from "./Tasks";
import NewTask from "./NewTask";
import TaskDetail from "./TaskDetail";
import Prefixes from "./Prefixes";
import { configureUrlQuery } from "react-url-query";
import ApplicationContext from "../utils/ApplicationContext";

const S4 = () => (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);

let history = createHistory();

configureUrlQuery({
    entrySeparator: "--",
    history: history
});

class App extends React.PureComponent {
    constructor(props, context) {
        super(props, context);
        this.state = {
            loading: true,
            applicationContext: {
                currentUser: {},
                configuration: {},
                organisations: [],
                locationCodes: [],
                products: [],
                redirect: url => history.push(url)
            },
            error: false,
            errorDialogOpen: false,
            redirectState: "/processes",
            errorDialogAction: () => {
                this.setState({ errorDialogOpen: false });
            }
        };
        window.onerror = (msg, url, line, col, err) => {
            if (err && err.response && (err.response.status === 401 || err.response.status === 403)) {
                localStorage.removeItem("access_token");
                this.componentDidMount();
                return;
            }
            this.setState({ errorDialogOpen: true });
            const info = err || {};
            const response = info.response || {};
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
    }

    handleBackendDown = err => {
        const location = window.location;
        const alreadyRetried = location.href.indexOf("guid") > -1;
        if (alreadyRetried) {
            window.location.href = `${location.protocol}//${location.hostname}${
                location.port ? ":" + location.port : ""
            }/error`;
        } else {
            //302 redirects from Shib are cached by the browser. We force a one-time reload
            const guid = (
                S4() +
                S4() +
                "-" +
                S4() +
                "-4" +
                S4().substr(0, 3) +
                "-" +
                S4() +
                "-" +
                S4() +
                S4() +
                S4()
            ).toLowerCase();
            window.location.href = `${location.href}?guid=${guid}`;
        }
    };

    componentDidMount() {
        const hash = window.location.hash;
        const accessTokenMatch = hash.match(/access_token=(.*?)&/);
        if (accessTokenMatch) {
            localStorage.setItem("access_token", accessTokenMatch[1]);
            const stateMatch = hash.match(/state=(.*?)&/);
            if (stateMatch) {
                this.setState({ redirectState: atob(stateMatch[1]) });
            }
            this.fetchUser();
        } else if (window.location.href.indexOf("error") > -1) {
            this.setState({ loading: false });
        } else {
            const accessToken = localStorage.getItem("access_token");
            if (!accessToken) {
                config().then(conf => {
                    if (conf.oauthEnabled) {
                        redirectToAuthorizationServer();
                    } else {
                        this.fetchUser();
                    }
                });
                return;
            }
            this.fetchUser();
        }
    }

    fetchUser() {
        config()
            .catch(err => this.handleBackendDown(err))
            .then(configuration => {
                me()
                    .then(currentUser => {
                        if (currentUser && (currentUser.sub || currentUser.user_name)) {
                            Promise.all([organisations(), products(), locationCodes()]).then(result => {
                                const [allOrganisations, allProducts, allLocationCodes] = result;
                                this.setState({
                                    loading: false,
                                    applicationContext: {
                                        currentUser: currentUser,
                                        configuration: configuration,
                                        organisations: allOrganisations,
                                        locationCodes: allLocationCodes,
                                        products: allProducts.sort((a, b) => a.name.localeCompare(b.name)),
                                        redirect: url => history.push(url)
                                    }
                                });
                            });
                        } else {
                            this.handleBackendDown();
                        }
                    })
                    .catch(err => {
                        if (err.response && (err.response.status === 401 || err.response.status === 403)) {
                            localStorage.removeItem("access_token");
                            this.componentDidMount();
                        } else {
                            throw err;
                        }
                    });
            });
    }

    render() {
        const { loading, errorDialogAction, errorDialogOpen, applicationContext, redirectState } = this.state;

        if (loading) {
            return null; // render null when app is not ready yet for static mySpinner
        }

        return (
            <Router history={history}>
                <ApplicationContext.Provider value={applicationContext}>
                    <div>
                        <div>
                            <Flash />
                            <Header />
                            <Navigation />
                            <ErrorDialog isOpen={errorDialogOpen} close={errorDialogAction} />
                        </div>
                        <Switch>
                            <Route exact path="/oauth2/callback" render={() => <Redirect to={redirectState} />} />
                            <Route exact path="/" render={() => <Redirect to="/processes" />} />
                            <ProtectedRoute path="/processes" render={() => <Processes />} />
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
                                path="/terminate-subscription"
                                render={props => (
                                    <TerminateSubscription
                                        subscriptionId={getParameterByName("subscription", props.location.search)}
                                    />
                                )}
                            />
                            <Route path="/process/:id" render={props => <ProcessDetail {...props} />} />
                            <Route path="/subscriptions" render={props => <Subscriptions {...props} />} />
                            <Route path="/old-subscriptions" render={() => <OldSubscriptions />} />
                            <Route
                                path="/subscription/:id"
                                render={props => <SubscriptionDetail match={props.match} />}
                            />
                            <ProtectedRoute path="/metadata/:type" render={props => <MetaData match={props.match} />} />
                            <ProtectedRoute path="/product/:id" render={props => <Product match={props.match} />} />
                            <ProtectedRoute
                                path="/product-block/:id"
                                render={props => <ProductBlock match={props.match} />}
                            />
                            <ProtectedRoute
                                path="/resource-type/:id"
                                render={props => <ResourceType match={props.match} />}
                            />
                            <ProtectedRoute path="/cache" render={() => <Cache />} />
                            <ProtectedRoute path="/tasks" render={() => <Tasks />} />
                            <ProtectedRoute path="/prefixes" render={() => <Prefixes />} />
                            <ProtectedRoute path="/new-task" render={() => <NewTask />} />
                            <Route path="/task/:id" render={props => <TaskDetail match={props.match} />} />
                            <Route path="/help" render={() => <Help />} />
                            <Route path="/not-allowed" render={() => <NotAllowed />} />
                            <Route path="/error" render={() => <ServerError />} />
                            <Route component={NotFound} />
                        </Switch>
                    </div>
                </ApplicationContext.Provider>
            </Router>
        );
    }
}

export default App;