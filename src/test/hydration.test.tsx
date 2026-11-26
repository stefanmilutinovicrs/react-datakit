import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import { Combobox } from '../combobox';
import { hydrationErrors } from './hydration';

const items = ['Ana', 'Bojan'];

function Tree({ note }: { note: string }) {
  return (
    <>
      <Combobox items={items} itemToString={(item) => item ?? ''} itemToKey={(item) => item}>
        <Combobox.Label>Owner</Combobox.Label>
        <Combobox.Input />
      </Combobox>
      <p>{note}</p>
    </>
  );
}

it('still reports a real hydration mismatch', async () => {
  const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
  const container = document.createElement('div');
  container.innerHTML = renderToString(<Tree note="server" />);
  document.body.append(container);
  const root = hydrateRoot(container, <Tree note="client" />, {
    onRecoverableError: (error) => console.error(error),
  });

  await expect.element(page.getByText('client')).toBeInTheDocument();
  await new Promise((resolve) => setTimeout(resolve, 50));
  expect(hydrationErrors(errors)).not.toEqual([]);

  root.unmount();
  container.remove();
  errors.mockRestore();
});
