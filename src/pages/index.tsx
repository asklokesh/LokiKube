import React from 'react';
import Layout from '@/components/Layout';
import ResourceDashboard from '@/components/ResourceDashboard';
import { NextPage } from 'next';

const HomePage: NextPage = () => {
  return (
    <Layout>
      <ResourceDashboard />
    </Layout>
  );
};

export default HomePage; 