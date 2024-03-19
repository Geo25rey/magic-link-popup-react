import { create } from "zustand";

import {
  InitOptions,
  LoginOptions,
  init,
  login,
  logout,
} from "magic-link-popup";

type State =
  | { initialized: false }
  | {
      initialized: true;
      loggedIn: boolean;
    };

const initialState: State = { initialized: false };

export const useMagicLinkPopup = create<State>(() => initialState);

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
  init(magicApiKey: string, loadingRoute: string, initOptions?: InitOptions) {
    init(magicApiKey, loadingRoute, initOptions);
    useMagicLinkPopup.setState(state => ({ ...state, initialized: true }));
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
      useMagicLinkPopup.setState(state => ({
        ...state,
        loggedIn: result.success,
      }))
    );
  },
  async logout() {
    await logout();
    useMagicLinkPopup.setState(state => ({ ...state, loggedIn: false }));
  },
};
