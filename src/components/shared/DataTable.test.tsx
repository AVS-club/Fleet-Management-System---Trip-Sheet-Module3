import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { act } from 'react';
import { describe, it, expect, vi } from 'vitest';
import DataTable from './DataTable';

describe('DataTable search', () => {
  it('filters rows based on search term after debounce', async () => {
    vi.useFakeTimers();
    const data = [
      { id: '1', name: 'Alice', role: 'Driver' },
      { id: '2', name: 'Bob', role: 'Mechanic' },
    ];
    const columns = [
      { key: 'name', label: 'Name' },
      { key: 'role', label: 'Role' },
    ];

    render(<DataTable columns={columns} data={data} searchKeys={['name']} />);

    fireEvent.change(screen.getByPlaceholderText('Search...'), {
      target: { value: 'bob' },
    });

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    expect(screen.queryByText('Alice')).not.toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();

    vi.useRealTimers();
  });
});
