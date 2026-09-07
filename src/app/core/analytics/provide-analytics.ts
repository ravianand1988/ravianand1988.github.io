import { EnvironmentProviders, inject, provideAppInitializer } from '@angular/core';
import { Analytics } from './analytics';

/**
 * App initializers run before the router's initial navigation, so the landing
 * page goes through the same NavigationEnd path as every later route and is
 * counted exactly once.
 */
export function provideAnalytics(): EnvironmentProviders {
  return provideAppInitializer(() => inject(Analytics).init());
}
