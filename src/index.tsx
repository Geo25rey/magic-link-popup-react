import {
  InitOptions,
  LoginOptions,
  init,
  login,
  logout,
  getMagic,
} from "magic-link-popup";

import React, {
  PropsWithChildren,
  createContext,
  useContext,
  useLayoutEffect,
} from "react";
import { createStore, useStore } from "zustand";
import { devtools } from "zustand/middleware";

type InitProps = State;

type RootStore = ReturnType<typeof initStoreForGSSP>;

/**
 * https://github.com/vercel/next.js/discussions/45763#discussioncomment-4934801
 */
const RootStoreContext = createContext<RootStore | null>(null);

/**
 * use in `_app.tsx` to provide magic link state to the rest of the app
 *
 *
 * Example usage without server side rendering:
 * ```tsx
 * function MyApp({ Component, pageProps }: AppProps) {
 *   return (
 *     <MagicLinkPopupProvider>
 *       <Component {...pageProps} />
 *     </MagicLinkPopupProvider>
 *   );
 * }
 * ```
 *
 * Example usage with server side rendering:
 * ```tsx
 * function MyApp({ Component, pageProps }: AppProps) {
 *   const { initialZustandState } = pageProps; // This is optional
 *
 *   return (
 *     <MagicLinkPopupProvider value={initialZustandState}>
 *       <Component {...pageProps} />
 *     </MagicLinkPopupProvider>
 *   );
 * }
 * ```
 * @param param0
 * @returns
 */
export function MagicLinkPopupProvider({
  value,
  children,
}: PropsWithChildren<{ value?: InitProps }>) {
  const store = useCreateStore(value);

  return (
    <RootStoreContext.Provider value={store()}>
      {children}
    </RootStoreContext.Provider>
  );
}

type State =
  | { initialized: false }
  | {
      initialized: true;
      loggedIn: boolean;
    };

const defaultStoreProps: State = { initialized: false };

// let store = createStore<State>(() => defaultStoreProps);

/**
 * initStoreForGSSP (Used within getServerSideProps)
 *
 * Initialize the store for use in `createRootStore` function below.
 * - This returns all the defaultState and actions.
 * - We can also pass `initProps` to this function if we are calling `initStoreForGSSP` in getServerSideProps.
 * For example doing a get request.
 */
const initStoreForGSSP = (initProps?: InitProps) => {
  // Main Store Functions
  return createStore<State>()(
    devtools(() => ({
      ...defaultStoreProps,
      ...initProps,
    }))
  );
};

/**
 * Define store that you can reusue throughout requests.
 */
let store: RootStore;

/**
 * `useCreateStore` which is used within `_app.tsx` to pass down to the Provider.
 */
const useCreateStore = (initProps?: InitProps) => {
  // Server side code: For SSR & SSG, always use a new store.
  if (typeof window === "undefined") {
    return () => initStoreForGSSP(initProps);
  }

  // Client side code:
  // Next.js always re-uses same store regardless of whether page is a SSR or SSG or CSR type.
  const isReusingStore = Boolean(store);

  store = store ?? initStoreForGSSP(initProps);
  // When next.js re-renders _app while re-using an older store, then replace current state with
  // the new state (in the next render cycle).
  // (Why next render cycle? Because react cannot re-render while a render is already in progress.
  // i.e. we cannot do a setState() as that will initiate a re-render)
  //
  // eslint complaining "React Hooks must be called in the exact same order in every component render"
  // is ignorable as this code runs in same order in a given environment (i.e. client or server)
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useLayoutEffect(() => {
    // serverInitialState is undefined for CSR pages. It is up to you if you want to reset
    // states on CSR page navigation or not. I have chosen not to, but if you choose to,
    // then add `serverInitialState = getDefaultInitialState()` here.
    if (initProps && isReusingStore) {
      store.setState(
        {
          // re-use functions from existing store
          ...store.getState(),
          // but reset all other properties.
          ...initProps,
        },
        true // replace states, rather than shallow merging
      );
    }
  });

  return () => store;
};

/**
 * Client Only.
 */
export const useMagicLinkPopup = () => {
  const store = useContext(RootStoreContext);
  if (!store) throw new Error("Missing MagicLinkPopupProvider in the tree");
  return useStore<RootStore>(store);
};

/**
 * This is a set of actions that can be used to interact with the Magic Link Popup and subsequently the Magic SDK itself.
 */
export const MagicLinkPopupActions = {
  /**
   * Run this as soon as possible even before the page finishes loading to initialize the Magic Link Popup.
   *
   * @param magicApiKey the public API key provided on the Magic Link dashboard
   * @param loadingRoute a route that indicates to the user that the Magic Link Popup is loading the login state.
   * @param initOptions options allowing you to customize the Magic Link Popup look and feel.
   */
  async init(
    magicApiKey: string,
    loadingRoute: string,
    initOptions?: InitOptions
  ) {
    init(magicApiKey, loadingRoute, initOptions);
    const loggedIn = await getMagic().user.isLoggedIn();
    store.setState(state => ({
      ...state,
      initialized: true,
      loggedIn,
    }));
  },
  /**
   * Initiates the Magic SDK login flow.
   *
   * Note: This function MUST be run from a user-interaction event handler AND the event handler MUST be synchronous.
   *
   * @returns a Promise that resolves when login is completed regardless of success.
   */
  login(loginOptions: LoginOptions) {
    return login(loginOptions).then(result =>
      store.setState(state => ({
        ...state,
        loggedIn: result.success,
      }))
    );
  },
  async logout() {
    await logout();
    store.setState(state => ({ ...state, loggedIn: false }));
  },
};
