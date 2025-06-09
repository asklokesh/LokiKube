import React from 'react';
import Layout from '@/components/Layout';
import Settings from '@/components/Settings';
import { NextPage } from 'next';

const SettingsPage: NextPage = () => {
  return (
    <Layout>
      <Settings />
    </Layout>
  );
};

export default SettingsPage;