// Minimal structural view of the Playwright API the browser checks use.
//
// Playwright is installed outside the repository and reached through
// PLAYWRIGHT_MODULE, so it is never a dependency and cannot be imported as a
// package type. These interfaces are that boundary: they name only the members
// a check calls, so a misspelled method or a wrong argument still fails the type
// check while the runtime module stays the real one.
export interface PageHandle {
  all(): Promise<PageHandle[]>;
  allTextContents(): Promise<string[]>;
  boundingBox(): Promise<{ x: number; y: number; width: number; height: number } | null>;
  click(options?: { position?: { x: number; y: number }; timeout?: number }): Promise<void>;
  check(): Promise<void>;
  count(): Promise<number>;
  evaluate<R, A = void>(
    pageFunction: (element: HTMLElement, arg: A) => R | Promise<R>,
    arg?: A,
  ): Promise<R>;
  evaluateAll<R, A = void>(
    pageFunction: (elements: HTMLElement[], arg: A) => R | Promise<R>,
    arg?: A,
  ): Promise<R>;
  fill(value: string): Promise<void>;
  focus(): Promise<void>;
  first(): PageHandle;
  getAttribute(name: string): Promise<string | null>;
  innerText(): Promise<string>;
  inputValue(): Promise<string>;
  isChecked(): Promise<boolean>;
  isDisabled(): Promise<boolean>;
  isEnabled(): Promise<boolean>;
  isVisible(): Promise<boolean>;
  last(): PageHandle;
  locator(selector: string): PageHandle;
  nth(index: number): PageHandle;
  scrollIntoViewIfNeeded(): Promise<void>;
  selectOption(value: string | string[]): Promise<string[]>;
  setInputFiles(
    files: { buffer: Buffer; mimeType: string; name: string } | string | string[],
  ): Promise<void>;
  textContent(): Promise<string | null>;
  waitFor(options?: {
    state?: "attached" | "detached" | "visible" | "hidden";
    timeout?: number;
  }): Promise<void>;
}

export interface PageError {
  message: string;
}

export interface PageMessage {
  text(): string;
  type(): string;
}

export interface PageResponse {
  request(): { resourceType(): string };
  status(): number;
  url(): string;
}

export interface PageDialog {
  accept(): Promise<void>;
  dismiss(): Promise<void>;
}

export interface Download {
  path(): Promise<string>;
  suggestedFilename(): string;
}

export interface Page {
  clock: {
    fastForward(ms: number): Promise<void>;
    install(): Promise<void>;
    resume(): Promise<void>;
  };
  close(): Promise<void>;
  emulateMedia(options: { reducedMotion?: "reduce" | "no-preference" }): Promise<void>;
  evaluate<R>(pageFunction: () => R | Promise<R>): Promise<R>;
  evaluate<A, R>(pageFunction: (arg: A) => R | Promise<R>, arg: A): Promise<R>;
  getByRole(role: string, options?: { name?: string | RegExp; exact?: boolean }): PageHandle;
  goto(url: string, options?: { timeout?: number }): Promise<unknown>;
  hover(selector: string): Promise<void>;
  keyboard: { press(key: string): Promise<void> };
  locator(selector: string): PageHandle;
  mouse: {
    down(options?: { button?: "left" | "right" }): Promise<void>;
    move(x: number, y: number, options?: { steps?: number }): Promise<void>;
    up(options?: { button?: "left" | "right" }): Promise<void>;
  };
  off(event: string, listener: (payload: never) => void): void;
  on(event: "console", listener: (message: PageMessage) => void): void;
  on(event: "dialog", listener: (dialog: PageDialog) => void): void;
  on(event: "pageerror", listener: (error: PageError) => void): void;
  on(event: "response", listener: (response: PageResponse) => void): void;
  once(event: "dialog", listener: (dialog: PageDialog) => void): void;
  once(event: string, listener: (payload: never) => void): void;
  reload(): Promise<unknown>;
  screenshot(options?: { fullPage?: boolean; path?: string }): Promise<unknown>;
  selectOption(selector: string, value: string | string[]): Promise<string[]>;
  setViewportSize(size: { height: number; width: number }): Promise<void>;
  title(): Promise<string>;
  url(): string;
  viewportSize(): { height: number; width: number } | null;
  waitForEvent(event: "download", options?: { timeout?: number }): Promise<Download>;
  waitForEvent(event: string, options?: { timeout?: number }): Promise<unknown>;
  waitForFunction<A>(
    pageFunction: (arg: A) => unknown,
    arg?: A,
    options?: { polling?: number; timeout?: number },
  ): Promise<unknown>;
  waitForLoadState(state?: "load" | "domcontentloaded" | "networkidle"): Promise<void>;
  waitForSelector(
    selector: string,
    options?: { state?: "attached" | "detached" | "visible" | "hidden"; timeout?: number },
  ): Promise<unknown>;
  waitForTimeout(timeout: number): Promise<void>;
  waitForURL(pattern: string | RegExp, options?: { timeout?: number }): Promise<unknown>;
}

export interface BrowserContext {
  addInitScript(pageFunction: () => void): Promise<void>;
  close(): Promise<void>;
  newPage(): Promise<Page>;
  on(event: "page", listener: (page: Page) => void): void;
  setOffline(offline: boolean): Promise<void>;
}

export interface Browser {
  close(): Promise<void>;
  newContext(options?: {
    deviceScaleFactor?: number;
    hasTouch?: boolean;
    isMobile?: boolean;
    viewport?: { height: number; width: number };
  }): Promise<BrowserContext>;
}

/** The single member of the module these checks need. */
export interface Playwright {
  chromium: { launch(options?: { headless?: boolean }): Promise<Browser> };
}
